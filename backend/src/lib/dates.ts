/**
 * dates.ts — small helpers for trip dates ("YYYY-MM-DD" strings, no time zones involved).
 */

/** Every date from start to end, inclusive: ("2026-11-10", "2026-11-12") → 3 dates. Max 14. */
export function tripDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const day = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (day <= last && dates.length < 14) {
    dates.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

/** Whole days from start to end, inclusive (can exceed 14; used to reject long trips). */
export function daysBetweenInclusive(start: string, end: string): number {
  const ms = new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}
