/**
 * status.ts — when a trip is, in words: "Starts tomorrow" / "In 31 days" before it begins,
 * "Happening now" during it, "Past trip" afterwards. Dates are "YYYY-MM-DD"; `today`
 * defaults to the traveller's local date.
 */
import { todayIso } from '@/features/planner/schema';

export type TripPhase = 'upcoming' | 'ongoing' | 'past';

/** Whole days from date a to date b ("2026-10-18" → "2026-10-19" = 1). */
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** The trip's phase, a short label, and days until it starts (upcoming only). */
export function tripStatus(start: string, end: string, today = todayIso()): { phase: TripPhase; label: string; days?: number } {
  const until = daysBetween(today, start);
  if (until > 0) return { phase: 'upcoming', label: until === 1 ? 'Starts tomorrow' : `In ${until} days`, days: until };
  if (daysBetween(today, end) >= 0) return { phase: 'ongoing', label: 'Happening now' };
  return { phase: 'past', label: 'Past trip' };
}
