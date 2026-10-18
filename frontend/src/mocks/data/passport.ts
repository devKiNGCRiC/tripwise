/**
 * passport.ts (mock data) — the demo API's copy of the backend's passport rules
 * (backend/src/services/passport.ts, marks.ts and worlds.ts). Same worlds, same twelve
 * Yatra marks, same stamp rules, so the website looks identical with or without a backend.
 * If you change a rule here, change it there too.
 */
import type { Passport, RegionKey, Stamp } from '@/lib/api/types';

/** The seven worlds: names, best months, season line and a place to suggest. */
const WORLDS: { key: RegionKey; name: string; bestMonths: number[]; season: string; suggest: string }[] = [
  { key: 'himalaya', name: 'Himalaya', bestMonths: [5, 6, 7, 8, 9, 10], season: 'Best May to Oct, when the passes open', suggest: 'Manali' },
  { key: 'thar', name: 'Thar', bestMonths: [10, 11, 12, 1, 2, 3], season: 'Best Oct to Mar, when the desert nights turn cool', suggest: 'Jaipur' },
  { key: 'ganga', name: 'Gangetic Plains', bestMonths: [10, 11, 12, 1, 2, 3], season: 'Best Oct to Mar, for misty ghats and festivals', suggest: 'Varanasi' },
  { key: 'deccan', name: 'Deccan Plateau', bestMonths: [10, 11, 12, 1, 2], season: 'Best Oct to Feb, when the old stones are cool to climb', suggest: 'Hampi' },
  { key: 'ghats', name: 'Western Ghats', bestMonths: [6, 7, 8, 9, 10], season: 'Best Jun to Oct for the monsoon green', suggest: 'Coorg' },
  { key: 'konkan', name: 'Konkan & Malabar', bestMonths: [11, 12, 1, 2, 3], season: 'Best Nov to Mar, for long beach sunsets', suggest: 'Goa' },
  { key: 'sisters', name: 'Seven Sisters', bestMonths: [10, 11, 12, 3, 4, 5], season: 'Best Oct to May, for clear hills and living root bridges', suggest: 'Shillong' },
];

/** The twelve Yatra marks. */
export const MARKS = [
  { id: 'first-steps', emoji: '🎒', name: 'First steps', how: 'Finish your first trip' },
  { id: 'wanderer', emoji: '🧭', name: 'Wanderer', how: 'Finish 3 trips' },
  { id: 'mountain-goat', emoji: '🏔', name: 'Mountain goat', how: 'Take a trip in the Himalaya' },
  { id: 'desert-wind', emoji: '🏜', name: 'Desert wind', how: 'Take a trip in the Thar' },
  { id: 'coast-calling', emoji: '🌊', name: 'Coast calling', how: 'Take a trip on the Konkan & Malabar coast, or to a beach abroad' },
  { id: 'monsoon-chaser', emoji: '🌧', name: 'Monsoon chaser', how: 'Start a trip between June and September' },
  { id: 'family-yatri', emoji: '👨‍👩‍👧', name: 'Family yatri', how: 'Take a family trip' },
  { id: 'long-road', emoji: '🛣', name: 'Long road', how: 'Take one trip of 7 days or more' },
  { id: 'storyteller', emoji: '✍️', name: 'Storyteller', how: 'Write 3 trip memories' },
  { id: 'beyond-india', emoji: '🌏', name: 'Beyond India', how: 'Take a trip abroad' },
  { id: 'three-worlds', emoji: '🗺', name: 'Three worlds', how: 'Visit 3 of the seven worlds' },
  { id: 'all-seven', emoji: '🪷', name: 'All seven worlds', how: 'Visit all seven worlds' },
];

/** Trip facts the passport needs. */
export interface TripLike {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  travellers: string;
  region: RegionKey | 'abroad' | null | undefined;
}

/** Journal facts the passport needs. */
export interface JournalLike {
  itineraryId: string;
  rating: number | null;
  memory: string;
  photos: { id: string }[];
  updatedAt: string;
}

/** Everything buildPassport needs. */
export interface PassportInput {
  cover: Passport['cover'];
  trips: TripLike[];
  journals: JournalLike[];
  destinations: { name: string; country: string; vibes: string[]; localName?: string }[];
  today: string;
  includeUpcoming: boolean;
  includeJournal: boolean;
}

/** Inclusive number of days in a trip. */
const lengthOf = (t: TripLike) => Math.round((Date.parse(`${t.endDate}T00:00:00Z`) - Date.parse(`${t.startDate}T00:00:00Z`)) / 86_400_000) + 1;

/** Build a passport (the same rules as the real API). */
export function buildPassport(input: PassportInput): Passport {
  const { trips, journals, today } = input;
  const placeOf = (name: string) => input.destinations.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());
  const completed = trips.filter((t) => t.endDate < today).sort((a, b) => a.endDate.localeCompare(b.endDate));

  // Worlds and the next one to unlock.
  const visited = new Set(completed.map((t) => t.region).filter((r): r is RegionKey => !!r && r !== 'abroad'));
  const month = Number(today.slice(5, 7));
  const soon = [0, 1, 2].map((i) => ((month - 1 + i) % 12) + 1);
  const unvisited = WORLDS.filter((w) => !visited.has(w.key));
  const next = unvisited.find((w) => w.bestMonths.some((m) => soon.includes(m))) ?? unvisited[0];

  // Marks: the end date of the first trip (or the third memory) that qualifies.
  const firstWhere = (test: (t: TripLike) => boolean) => completed.find(test)?.endDate ?? null;
  const reached: string[] = [];
  const seen = new Set<string>();
  for (const t of completed) {
    if (t.region && t.region !== 'abroad' && !seen.has(t.region)) {
      seen.add(t.region);
      reached.push(t.endDate);
    }
  }
  const memories = journals.filter((j) => j.memory.trim()).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const beachAbroad = (t: TripLike) => t.region === 'abroad' && !!placeOf(t.destination)?.vibes.includes('beach');
  const earnedOn: Record<string, string | null> = {
    'first-steps': completed[0]?.endDate ?? null,
    wanderer: completed[2]?.endDate ?? null,
    'mountain-goat': firstWhere((t) => t.region === 'himalaya'),
    'desert-wind': firstWhere((t) => t.region === 'thar'),
    'coast-calling': firstWhere((t) => t.region === 'konkan' || beachAbroad(t)),
    'monsoon-chaser': firstWhere((t) => [6, 7, 8, 9].includes(Number(t.startDate.slice(5, 7)))),
    'family-yatri': firstWhere((t) => t.travellers === 'family'),
    'long-road': firstWhere((t) => lengthOf(t) >= 7),
    storyteller: memories[2]?.updatedAt.slice(0, 10) ?? null,
    'beyond-india': firstWhere((t) => t.region === 'abroad'),
    'three-worlds': reached[2] ?? null,
    'all-seven': reached[6] ?? null,
  };
  const marks = MARKS.map((m) => ({ ...m, earnedAt: earnedOn[m.id] ?? null }));

  // Stamps, newest first.
  const stamps: Stamp[] = trips
    .filter((t) => t.endDate < today || input.includeUpcoming)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((t) => {
      const done = t.endDate < today;
      const place = placeOf(t.destination);
      const journal = journals.find((j) => j.itineraryId === t.id);
      return {
        id: t.id,
        destination: t.destination,
        ...(place?.localName ? { localName: place.localName } : {}),
        region: t.region ?? null,
        startDate: t.startDate,
        endDate: t.endDate,
        status: done ? 'completed' : 'upcoming',
        ...(done ? {} : { daysUntil: Math.max(0, Math.round((Date.parse(`${t.startDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)) }),
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
    cover: input.cover,
    stats: {
      trips: completed.length,
      worlds: visited.size,
      daysAway: completed.reduce((sum, t) => sum + lengthOf(t), 0),
      marks: marks.filter((m) => m.earnedAt).length,
    },
    worlds: WORLDS.map((w) => ({ key: w.key, name: w.name, visited: visited.has(w.key) })),
    abroadCount: completed.filter((t) => t.region === 'abroad').length,
    nextWorld: next ? { key: next.key, name: next.name, bestMonths: next.bestMonths, suggest: next.suggest, line: `Next to unlock: ${next.name}. ${next.season}.` } : null,
    marks,
    stamps,
  };
}
