/**
 * time.ts (yatra) — times on the trip, always in India time: "5 pm", "6:30 pm", minutes until a
 * Sangam, and the moment for "day N at HH:MM" of a Sahyatra.
 */

/** "5 pm" / "6:30 pm" (India time). */
export function clockText(iso: string): string {
  const d = new Date(iso);
  const minutes = Number(d.toLocaleString('en-IN', { minute: 'numeric', timeZone: 'Asia/Kolkata' }));
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', ...(minutes ? { minute: '2-digit' } : {}), timeZone: 'Asia/Kolkata' }).replace(/\s?([ap])\.?m\.?/i, ' $1m').toLowerCase();
}

/** Whole minutes from now until `iso` (negative once it has passed). */
export const minutesUntil = (iso: string, now = Date.now()) => Math.round((Date.parse(iso) - now) / 60_000);

/** "YYYY-MM-DD" of day `n` of a trip starting on `start`. */
export function dateOfDay(start: string, n: number): string {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n - 1);
  return d.toISOString().slice(0, 10);
}

/** The moment (ISO) for a date and an India-time "HH:MM". */
export const indiaTime = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`).toISOString();
