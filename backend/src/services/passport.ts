/**
 * passport.ts — builds a traveller's passport from their trips and journals.
 *
 * Pure: it takes plain data and returns plain data (no database), so the same rules can be
 * tested directly and copied into the website's demo API. A trip counts once it is
 * *completed* (it ended before today, India time):
 *   - its world lights up, and it can earn Yatra marks;
 *   - it leaves an ink stamp (upcoming trips get a dashed stamp, on your own passport only).
 */
import { tripDates } from '../lib/dates.js';
import type { RegionKey } from '../lib/enums.js';
import { MARKS } from './marks.js';
import { WORLDS } from './worlds.js';

/** The trip facts the passport needs. */
export interface TripLike {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  travellers: string;
  region: RegionKey | 'abroad' | null | undefined;
}

/** The journal facts the passport needs. */
export interface JournalLike {
  itineraryId: string;
  rating: number | null;
  memory: string;
  photos: { id: string }[];
  updatedAt: string;
}

/** Catalogue facts used for Hindi names and "beach" places. */
export interface DestinationLike {
  name: string;
  country: string;
  vibes: string[];
  region?: string | null;
  localName?: string | null;
}

/** Everything buildPassport needs. */
export interface PassportInput {
  user: {
    name: string;
    username: string;
    avatarUrl?: string;
    bio: string;
    travellerType: string | null;
    homeCity: string;
    createdAt: string;
    theme: unknown;
  };
  trips: TripLike[];
  journals: JournalLike[];
  destinations: DestinationLike[];
  /** Today in India, "YYYY-MM-DD". */
  today: string;
  /** Show upcoming trips (only on your own passport). */
  includeUpcoming: boolean;
  /** Show journal ratings, memories and photos on stamps. */
  includeJournal: boolean;
}

/** One stamp on the visa pages. */
export interface Stamp {
  id: string;
  destination: string;
  localName?: string;
  region: RegionKey | 'abroad' | null;
  startDate: string;
  endDate: string;
  status: 'completed' | 'upcoming';
  daysUntil?: number;
  journal?: { rating: number | null; hasMemory: boolean; photoCount: number; coverPhotoUrl?: string };
}

/** The whole passport. */
export type Passport = ReturnType<typeof buildPassport>;

/** Whole days from one date to another ("YYYY-MM-DD"). */
const daysFrom = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Build the passport. */
export function buildPassport(input: PassportInput) {
  const { trips, journals, today } = input;
  const placeOf = (name: string) => input.destinations.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

  // Completed trips, oldest first (marks are "earned" on the trip that first qualified).
  const completed = trips.filter((t) => t.endDate < today).sort((a, b) => a.endDate.localeCompare(b.endDate));
  const length = (t: TripLike) => tripDates(t.startDate, t.endDate).length;

  // ── Worlds ──
  const visited = new Set(completed.map((t) => t.region).filter((r): r is RegionKey => !!r && r !== 'abroad'));
  const worlds = WORLDS.map((w) => ({ key: w.key, name: w.name, visited: visited.has(w.key) }));
  const abroadCount = completed.filter((t) => t.region === 'abroad').length;

  // The next world: one in season soon (this month or the next two), else the first unvisited.
  const month = Number(today.slice(5, 7));
  const soon = [0, 1, 2].map((i) => ((month - 1 + i) % 12) + 1);
  const unvisited = WORLDS.filter((w) => !visited.has(w.key));
  const next = unvisited.find((w) => w.bestMonths.some((m) => soon.includes(m))) ?? unvisited[0];
  const nextWorld = next ? { key: next.key, name: next.name, bestMonths: next.bestMonths, suggest: next.suggest, line: `Next to unlock: ${next.name}. ${next.season}.` } : null;

  // ── Marks: the end date of the first completed trip (or journal) that qualifies ──
  const firstWhere = (test: (t: TripLike) => boolean) => completed.find(test)?.endDate ?? null;
  const nth = (n: number) => completed[n - 1]?.endDate ?? null;
  // The date the n-th distinct world was reached.
  const worldsReached: string[] = [];
  const seen = new Set<string>();
  for (const t of completed) {
    if (t.region && t.region !== 'abroad' && !seen.has(t.region)) {
      seen.add(t.region);
      worldsReached.push(t.endDate);
    }
  }
  const memories = journals.filter((j) => j.memory.trim()).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const isBeachAbroad = (t: TripLike) => t.region === 'abroad' && !!placeOf(t.destination)?.vibes.includes('beach');
  const earnedOn: Record<string, string | null> = {
    'first-steps': nth(1),
    wanderer: nth(3),
    'mountain-goat': firstWhere((t) => t.region === 'himalaya'),
    'desert-wind': firstWhere((t) => t.region === 'thar'),
    'coast-calling': firstWhere((t) => t.region === 'konkan' || isBeachAbroad(t)),
    'monsoon-chaser': firstWhere((t) => [6, 7, 8, 9].includes(Number(t.startDate.slice(5, 7)))),
    'family-yatri': firstWhere((t) => t.travellers === 'family'),
    'long-road': firstWhere((t) => length(t) >= 7),
    storyteller: memories[2]?.updatedAt.slice(0, 10) ?? null,
    'beyond-india': firstWhere((t) => t.region === 'abroad'),
    'three-worlds': worldsReached[2] ?? null,
    'all-seven': worldsReached[6] ?? null,
  };
  const marks = MARKS.map((m) => ({ ...m, earnedAt: earnedOn[m.id] ?? null }));

  // ── Stamps: newest first ──
  const journalOf = (id: string) => journals.find((j) => j.itineraryId === id);
  const stamps: Stamp[] = trips
    .filter((t) => t.endDate < today || input.includeUpcoming)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((t) => {
      const done = t.endDate < today;
      const place = placeOf(t.destination);
      const journal = journalOf(t.id);
      return {
        id: t.id,
        destination: t.destination,
        ...(place?.localName ? { localName: place.localName } : {}),
        region: t.region ?? null,
        startDate: t.startDate,
        endDate: t.endDate,
        status: done ? 'completed' : 'upcoming',
        ...(done ? {} : { daysUntil: Math.max(0, daysFrom(today, t.startDate)) }),
        ...(input.includeJournal && done
          ? {
              journal: {
                rating: journal?.rating ?? null,
                hasMemory: !!journal?.memory.trim(),
                photoCount: journal?.photos.length ?? 0,
                ...(journal?.photos[0] ? { coverPhotoUrl: `/api/photos/${journal.photos[0].id}` } : {}),
              },
            }
          : {}),
      };
    });

  return {
    cover: {
      name: input.user.name,
      username: input.user.username,
      ...(input.user.avatarUrl ? { avatarUrl: input.user.avatarUrl } : {}),
      bio: input.user.bio,
      travellerType: input.user.travellerType,
      homeCity: input.user.homeCity,
      joined: input.user.createdAt,
      theme: input.user.theme ?? null,
    },
    stats: {
      trips: completed.length,
      worlds: visited.size,
      daysAway: completed.reduce((sum, t) => sum + length(t), 0),
      marks: marks.filter((m) => m.earnedAt).length,
    },
    worlds,
    abroadCount,
    nextWorld,
    marks,
    stamps,
  };
}
