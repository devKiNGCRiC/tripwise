/**
 * urlDates.ts — trip dates the planner can take from its address:
 *   ?start=2026-12-01&end=2026-12-04  exact dates (from a festival); used only if they're
 *                                     real dates, not in the past and within MAX_DAYS
 *   ?month=12                         a 4-day trip early in that month — this year's if it's
 *                                     still ahead, else next year's; this month starts in 3 days
 * Anything else gives no dates (the traveller picks them as usual).
 */
import { addDays, isoDay } from '@/world/monthGuide';
import { MAX_DAYS, tripLength } from './schema';

/** Length of a trip made from just a month. */
const MONTH_TRIP_DAYS = 4;
/** Days from today a trip in the current month starts. */
const LEAD_DAYS = 3;

/** Is this a real "YYYY-MM-DD" calendar date? */
function isIsoDate(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
}

/** Start and end dates from the planner's address, if it carries usable ones. */
export function datesFromUrl(params: URLSearchParams, now: Date = new Date()): { startDate?: string; endDate?: string } {
  const today = isoDay(now);
  const start = params.get('start');
  const end = params.get('end');
  if (isIsoDate(start) && isIsoDate(end)) {
    const days = tripLength(start, end);
    return start >= today && days >= 1 && days <= MAX_DAYS ? { startDate: start, endDate: end } : {};
  }

  const month = Number(params.get('month'));
  if (!Number.isInteger(month) || month < 1 || month > 12) return {};
  const thisMonth = now.getMonth() + 1;
  const startDate =
    month === thisMonth
      ? addDays(today, LEAD_DAYS)
      : `${now.getFullYear() + (month > thisMonth ? 0 : 1)}-${String(month).padStart(2, '0')}-01`;
  return { startDate, endDate: addDays(startDate, MONTH_TRIP_DAYS - 1) };
}
