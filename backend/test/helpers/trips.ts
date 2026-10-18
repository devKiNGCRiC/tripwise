/**
 * trips.ts (test helper) — save trips straight into the test database (the planner refuses
 * past dates, but journals and passports need finished trips).
 */
import { Itinerary } from '../../src/db/models/index.js';
import { buildItinerary } from '../../src/services/buildItinerary.js';
import { aiTripFixture, tripRequest } from './fakeAi.js';
import type { TripRequest } from '../../src/types/api.js';

/** Save a trip for `ownerId` (finished in September 2026 unless dates are given); returns its id. */
export async function saveTrip(ownerId: string, overrides: Partial<TripRequest> = {}, region: string | null = 'konkan'): Promise<string> {
  const req = tripRequest({ startDate: '2026-09-10', endDate: '2026-09-12', ...overrides });
  const trip = await Itinerary.create(buildItinerary(aiTripFixture(req), req, { ownerId, provider: 'gemini', source: 'ai', region }));
  return trip._id.toString();
}
