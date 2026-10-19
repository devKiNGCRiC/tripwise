/**
 * monthGuide.ts — small helpers for the month-by-month guide:
 *   weatherIn    a month's temperature range and a plain-words feel, from the averages
 *   festivalWhen a festival's dates for display: exact while still to come (and "on now"
 *                while running), otherwise when it usually happens
 *   planLink     a planner address for a place, with a month or a festival's dates
 *   seasonLabel  best months in words, e.g. "Mar–Jun, Sep–Oct" 
 *   addDays      shift a "YYYY-MM-DD" date
 */
import type { Climate, Festival } from './regionMonths';

/** Short month names, January first. */
export const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Long month names, January first. */
export const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A whole °C with a true minus sign. */
const degrees = (v: number) => {
  const n = Math.round(v);
  return n < 0 ? `−${-n}` : String(n);
};

/** A month's temperature range ("−1 to 11°C") and how it feels ("Freezing nights · some showers"). */
export function weatherIn(climate: Climate, month: number): { range: string; feel: string } {
  const i = month - 1;
  const [high, low, rain] = [climate.high[i], climate.low[i], climate.rainDays[i]];
  const range = `${degrees(low)} to ${degrees(high)}°C`;
  // Rain most days says it all.
  if (rain >= 15) return { range, feel: 'Monsoon — rain most days' };
  const temperature =
    high >= 38 ? 'Very hot days' : high >= 33 ? 'Hot days' : low <= 2 ? 'Freezing nights' : low <= 10 ? 'Cold nights' : high <= 24 ? 'Cool and fresh' : 'Warm days';
  const wet = rain >= 8 ? 'frequent rain' : rain >= 3 ? 'some showers' : 'mostly dry';
  return { range, feel: `${temperature} · ${wet}` };
}

/** "YYYY-MM-DD" for a date, local time. */
export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" shifted by `days` (calendar arithmetic, no time zones involved). */
export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Day, month and year of "YYYY-MM-DD". */
const parts = (iso: string) => ({ y: iso.slice(0, 4), m: SHORT_MONTHS[Number(iso.slice(5, 7)) - 1], d: String(Number(iso.slice(8, 10))) });

/** "24 Nov 2026", "1–10 Dec 2026", "22 Jan – 6 Mar 2027" or "28 Dec 2026 – 2 Jan 2027". */
function formatRange(start: string, end?: string) {
  const a = parts(start);
  if (!end || end === start) return `${a.d} ${a.m} ${a.y}`;
  const b = parts(end);
  if (a.y !== b.y) return `${a.d} ${a.m} ${a.y} – ${b.d} ${b.m} ${b.y}`;
  if (a.m !== b.m) return `${a.d} ${a.m} – ${b.d} ${b.m} ${b.y}`;
  return `${a.d}–${b.d} ${a.m} ${a.y}`;
}

/** How to show a festival's timing today. `dated` = real dates (not "usually"). */
export function festivalWhen(festival: Festival, now: Date): { label: string; expected: boolean; onNow: boolean; dated: boolean } {
  const today = isoDay(now);
  const next = festival.next;
  if (next && (next.end ?? next.start) >= today) {
    return { label: formatRange(next.start, next.end), expected: !!next.expected, onNow: next.start <= today, dated: true };
  }
  return { label: festival.usually, expected: false, onNow: false, dated: false };
}

/** Longest trip a festival link suggests (the traveller can change it). */
const FESTIVAL_TRIP_DAYS = 4;

/**
 * A planner address: a place plus either a month, or a festival's dates. A one-day
 * festival gets a trip from the day before; a longer one, its first few days.
 */
export function planLink(destination: string, when: { month: number } | { start: string; end?: string }) {
  const params = new URLSearchParams({ destination });
  if ('month' in when) {
    params.set('month', String(when.month));
  } else if (!when.end || when.end === when.start) {
    params.set('start', addDays(when.start, -1));
    params.set('end', addDays(when.start, FESTIVAL_TRIP_DAYS - 2));
  } else {
    const last = addDays(when.start, FESTIVAL_TRIP_DAYS - 1);
    params.set('start', when.start);
    params.set('end', when.end < last ? when.end : last);
  }
  return `/plan?${params.toString()}`;
}

/** Best months in words: "Oct–Apr", "Mar–Jun, Sep–Oct", "Jul" or "All year". */
export function seasonLabel(months: number[]) {
  const set = new Set(months);
  if (set.size >= 12) return 'All year';
  const prev = (m: number) => (m === 1 ? 12 : m - 1);
  const next = (m: number) => (m === 12 ? 1 : m + 1);
  const runs: string[] = [];
  for (let m = 1; m <= 12; m++) {
    // A run starts at a month whose previous month isn't in the set.
    if (!set.has(m) || set.has(prev(m))) continue;
    let end = m;
    while (set.has(next(end))) end = next(end);
    runs.push(end === m ? SHORT_MONTHS[m - 1] : `${SHORT_MONTHS[m - 1]}–${SHORT_MONTHS[end - 1]}`);
  }
  return runs.join(', ');
}
