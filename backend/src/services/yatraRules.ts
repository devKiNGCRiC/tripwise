/**
 * yatraRules.ts — rules for being together on the trip, with no imports so both the API and the
 * website's demo mock use exactly the same ones (the website reaches it as `@yatra-rules`):
 *   nearestPlace     which catalogue place a position is near, and how far (no paid maps needed)
 *   roundPosition    a position to about 1 km, for Kushal (family) links
 *   mapsLink         a link that opens the phone's own maps app
 *   sharingUntil     when location sharing ends: in 1 hour, at the Sangam, or when the trip ends
 *   headcount        who has said "I'm here" at the Sangam, and who is still missing
 *   isValidPosition  a real latitude and longitude
 */

/** How long someone shares where they are. */
export type ShareFor = '1h' | 'sangam' | 'trip';

/** The Earth's radius in km (for distances). */
const EARTH_KM = 6371;
/** Degrees → radians. */
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Distance between two points in km (haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(a));
}

/** The closest place to a position, with the distance to one decimal (null without places). */
export function nearestPlace(lat: number, lon: number, places: { name: string; lat: number; lon: number }[]): { name: string; km: number } | null {
  let best: { name: string; km: number } | null = null;
  for (const p of places) {
    const km = distanceKm(lat, lon, p.lat, p.lon);
    if (!best || km < best.km) best = { name: p.name, km };
  }
  return best && { name: best.name, km: Math.round(best.km * 10) / 10 };
}

/** A position rounded to 2 decimals (about 1 km) — enough for family, not a doorstep. */
export function roundPosition(lat: number, lon: number): { lat: number; lon: number } {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

/** A link the phone opens in its maps app. */
export function mapsLink(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

/** When sharing would end (ISO), or null when that end is missing or already past. */
export function sharingUntil(choice: ShareFor, nowIso: string, sangamAt?: string | null, tripEndIso?: string | null): string | null {
  const now = Date.parse(nowIso);
  if (choice === '1h') return new Date(now + 60 * 60 * 1000).toISOString();
  const end = choice === 'sangam' ? sangamAt : tripEndIso;
  return end && Date.parse(end) > now ? new Date(end).toISOString() : null;
}

/** Who is here at the Sangam and who is missing — current members only, in member order. */
export function headcount(memberIds: string[], here: string[]): { here: string[]; missing: string[] } {
  const arrived = new Set(here);
  return { here: memberIds.filter((id) => arrived.has(id)), missing: memberIds.filter((id) => !arrived.has(id)) };
}

/** A real latitude (−90…90) and longitude (−180…180). */
export function isValidPosition(lat: unknown, lon: unknown): boolean {
  return typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}
