/**
 * format.ts (trips) — words for itinerary details: transfer lines ("12 min by auto"),
 * friendly dates ("Fri 12 Dec") and date ranges ("12 – 14 Dec 2026"), traveller and pace names.
 */
import type { Activity, Pace, Travellers } from '@/lib/api/types';

/** "Fri 12 Dec" for an ISO date. */
export function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "12 – 14 Dec 2026" (or "28 Dec 2026 – 2 Jan 2027" across months/years). */
export function rangeLabel(start: string, end: string) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const full = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()} – ${full(b)}`;
  return `${full(a)} – ${full(b)}`;
}

/** "12 min by auto", "8 min walk", "25 min by boat". */
export function transferLabel(transfer: NonNullable<Activity['transfer']>) {
  return transfer.mode === 'walk' ? `${transfer.minutes} min walk` : `${transfer.minutes} min by ${transfer.mode}`;
}

/** How each traveller type reads. */
export const TRAVELLER_LABEL: Record<Travellers, string> = { solo: 'Solo', couple: 'Couple', friends: 'Friends', family: 'Family' };
/** How each pace reads. */
export const PACE_LABEL: Record<Pace, string> = { chill: 'Chill pace', balanced: 'Balanced pace', packed: 'Packed pace' };
