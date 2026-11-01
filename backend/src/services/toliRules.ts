/**
 * toliRules.ts — the rules of a Toli (a group planning a trip together), as pure functions
 * with no imports at run time, so the API and the website's demo mock follow exactly the
 * same rules:
 *   isLeader / canPost   who leads, and who may write in Chaupal (the Toli's chat)
 *   defaultsForType      what a new Toli starts with for its kind of trip
 *   applySujhav          a suggestion (Sujhav) applied to the shared plan — or refused when the
 *                        plan has changed since it was suggested, or the trip would get too long
 *   tallyPoll            votes counted for current members only, and who hasn't voted yet
 *   budgetRange          the daily budget everyone is comfortable with (never anyone's own numbers)
 */

/** A member's place in the Toli: the Sutradhar (leader), a Sah-Sutradhar (co-leader) or a Sahyatri. */
export type ToliRole = 'sutradhar' | 'sah' | 'sahyatri';
/** What kind of trip the Toli is for. */
export type TripType = 'friends' | 'family' | 'college' | 'office';

/** A stop in the plan (the shape of an itinerary activity). */
export interface StopLike {
  time: 'morning' | 'afternoon' | 'evening';
  startTime?: string;
  title: string;
  description: string;
  location?: string;
  estCost?: number;
  transfer?: { mode: string; minutes: number };
  place?: { id: string; lat: number; lon: number };
}
/** A day in the plan. */
export interface DayLike {
  dayNumber: number;
  date: string;
  theme: string;
  activities: StopLike[];
}
/** A new stop someone suggests. */
export type StopDraft = Pick<StopLike, 'time' | 'startTime' | 'title' | 'description'>;

/**
 * One suggested change. Days are numbered from 1, stops from 0. Changes to an existing stop
 * carry its title as it was when suggested, to notice if the plan has changed since.
 */
export type SujhavChange =
  | { kind: 'add-stop'; day: number; at: number; stop: StopDraft }
  | { kind: 'remove-stop'; day: number; index: number; title: string }
  | { kind: 'swap-stop'; day: number; index: number; title: string; stop: StopDraft }
  | { kind: 'move-stop'; day: number; index: number; title: string; toDay: number; toIndex: number }
  | { kind: 'retheme-day'; day: number; theme: string }
  | { kind: 'add-day'; theme: string }
  | { kind: 'change-transport'; day: number; index: number; title: string; mode: string };

/** The result of applying a suggestion. */
export type SujhavResult = { ok: true; days: DayLike[] } | { ok: false; reason: 'stale' | 'too-long' };

/** Minutes for a transfer that didn't have one yet. */
const DEFAULT_TRANSFER_MINUTES = 15;

/** Sutradhar and Sah-Sutradhars lead; Sahyatris don't. */
export function isLeader(role: ToliRole): boolean {
  return role === 'sutradhar' || role === 'sah';
}

/**
 * May this member write in Chaupal right now? Leaders always may; everyone may when the
 * Toli isn't in announcement mode; otherwise only with a granted message or time window.
 */
export function canPost(member: { role: ToliRole; postUntil?: string | null; oneMessage?: boolean }, announcementMode: boolean, nowIso: string): boolean {
  if (isLeader(member.role) || !announcementMode) return true;
  if (member.oneMessage) return true;
  return !!member.postUntil && member.postUntil > nowIso;
}

/** What a new Toli starts with: big groups (college, office) begin in announcement mode. */
export function defaultsForType(type: TripType): { announcementMode: boolean } {
  return { announcementMode: type === 'college' || type === 'office' };
}

/** "YYYY-MM-DD" plus one day. */
function nextDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** The last stop of a day goes nowhere next: drop its transfer. */
function tidy(day: DayLike) {
  const last = day.activities[day.activities.length - 1];
  if (last) delete last.transfer;
}

/** Apply a suggestion to a copy of the plan (`maxDays` = the longest trip allowed). */
export function applySujhav(days: DayLike[], change: SujhavChange, maxDays: number): SujhavResult {
  const next: DayLike[] = structuredClone(days);
  const STALE = { ok: false, reason: 'stale' } as const;
  /** The day by number, or undefined. */
  const dayOf = (n: number) => next[n - 1];
  /** The stop at day/index, if it still has the title it had when suggested. */
  const stopOf = (n: number, index: number, title: string) => {
    const stop = dayOf(n)?.activities[index];
    return stop && stop.title === title ? stop : undefined;
  };

  switch (change.kind) {
    case 'add-stop': {
      const day = dayOf(change.day);
      if (!day) return STALE;
      day.activities.splice(Math.max(0, Math.min(change.at, day.activities.length)), 0, { ...change.stop });
      tidy(day);
      break;
    }
    case 'remove-stop': {
      if (!stopOf(change.day, change.index, change.title)) return STALE;
      dayOf(change.day).activities.splice(change.index, 1);
      tidy(dayOf(change.day));
      break;
    }
    case 'swap-stop': {
      const old = stopOf(change.day, change.index, change.title);
      if (!old) return STALE;
      // The new stop keeps the old one's way onwards.
      dayOf(change.day).activities[change.index] = { ...change.stop, ...(old.transfer ? { transfer: old.transfer } : {}) };
      break;
    }
    case 'move-stop': {
      const stop = stopOf(change.day, change.index, change.title);
      const target = dayOf(change.toDay);
      if (!stop || !target) return STALE;
      dayOf(change.day).activities.splice(change.index, 1);
      target.activities.splice(Math.max(0, Math.min(change.toIndex, target.activities.length)), 0, stop);
      tidy(dayOf(change.day));
      tidy(target);
      break;
    }
    case 'retheme-day': {
      const day = dayOf(change.day);
      if (!day) return STALE;
      day.theme = change.theme;
      break;
    }
    case 'add-day': {
      if (next.length >= maxDays) return { ok: false, reason: 'too-long' };
      const last = next[next.length - 1];
      next.push({ dayNumber: next.length + 1, date: last ? nextDate(last.date) : '', theme: change.theme, activities: [] });
      break;
    }
    case 'change-transport': {
      const day = dayOf(change.day);
      const stop = stopOf(change.day, change.index, change.title);
      // The last stop of a day has no next stop to travel to.
      if (!stop || change.index >= day.activities.length - 1) return STALE;
      stop.transfer = { mode: change.mode, minutes: stop.transfer?.minutes ?? DEFAULT_TRANSFER_MINUTES };
      break;
    }
  }
  return { ok: true, days: next };
}

/** Votes counted for current members only; `leading` holds every option with the most votes. */
export function tallyPoll(
  options: { id: string }[],
  votes: Record<string, string[]>,
  memberIds: string[],
): { counts: Record<string, number>; voted: string[]; notVoted: string[]; leading: string[] } {
  const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o.id, 0]));
  const voted = memberIds.filter((id) => (votes[id]?.length ?? 0) > 0);
  for (const id of voted) for (const option of votes[id]) if (option in counts) counts[option] += 1;
  const top = Math.max(0, ...Object.values(counts));
  return { counts, voted, notVoted: memberIds.filter((id) => !voted.includes(id)), leading: top > 0 ? options.filter((o) => counts[o.id] === top).map((o) => o.id) : [] };
}

/**
 * The daily budget that suits everyone who answered: the overlap of their [low, high] ranges.
 * No overlap → no range, and `closest` shows the gap to bridge (the lowest "high" to the
 * highest "low"). Only current members count; nobody's own numbers are returned.
 */
export function budgetRange(entries: Record<string, [number, number]>, memberIds: string[]): { answered: number; range: [number, number] | null; closest?: [number, number] } {
  const ranges = memberIds.flatMap((id) => (entries[id] ? [entries[id]] : []));
  if (!ranges.length) return { answered: 0, range: null };
  const low = Math.max(...ranges.map((r) => r[0]));
  const high = Math.min(...ranges.map((r) => r[1]));
  return low <= high ? { answered: ranges.length, range: [low, high] } : { answered: ranges.length, range: null, closest: [high, low] };
}
