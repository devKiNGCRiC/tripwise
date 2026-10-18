/**
 * itineraries.ts (mock) — fake AI planner endpoints:
 *   POST   /itineraries/generate             → new plan + quota (5 per user per day)
 *   POST   /itineraries/generate/stream      → the same, streamed day by day (JSON lines)
 *   GET    /itineraries, /itineraries/:id    → the caller's own trips only
 *   DELETE /itineraries/:id
 *   POST   /itineraries/:id/days/:n/regenerate
 *   POST   /itineraries/:id/share            → { shareId }
 *   GET    /share/:shareId                   → public read-only trip (no login)
 *   GET    /me/quota
 * Someone else's trip answers NOT_FOUND (never reveal it exists). The destination
 * "fail-ai" simulates both AI providers being down (AI_UNAVAILABLE).
 */
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import type { Destination, Itinerary, Quota, TripRequest } from '@/lib/api/types';
import { buildDay, generateItinerary } from '../data/generator';
import { db, saveTrips, type StoredItinerary } from '../db';
import { currentUser, errorResponse, latency } from './shared';

/** AI plans allowed per user per day. */
const DAILY_LIMIT = 5;

/** Today's date "YYYY-MM-DD" (local time). */
function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** The caller's quota right now (a new day starts at local midnight). */
function quotaFor(userId: string): Quota {
  const record = db.generations[userId];
  const used = record?.day === today() ? record.used : 0;
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return { used, limit: DAILY_LIMIT, resetsAt: midnight.toISOString() };
}

/** Strip the owner field before sending a trip out (mock trips are always AI-written). */
function publicTrip({ ownerId: _ownerId, ...itinerary }: StoredItinerary): Itinerary {
  return { source: 'ai', ...itinerary };
}

/** Find a trip the caller owns, or null. */
function ownTrip(userId: string, id: unknown) {
  return db.itineraries.find((t) => t.id === id && t.ownerId === userId) ?? null;
}

/** A catalogue place's world ('abroad' outside India); unknown places have none. */
function regionOf(destination: Destination | undefined): Itinerary['region'] {
  if (!destination) return null;
  return destination.country === 'India' ? (destination.region ?? null) : 'abroad';
}

/** Small unique ids for the mock store. */
let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export const itineraryHandlers = [
  // POST /itineraries/generate — check login and quota, then "think" and build a plan.
  http.post(apiUrl('/itineraries/generate'), async ({ request }) => {
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const req = (await request.json()) as TripRequest;
    if (req.destination.trim().toLowerCase() === 'fail-ai') return errorResponse(503, 'AI_UNAVAILABLE', 'Both AI planners are busy — try again in a minute.');
    const quota = quotaFor(user.id);
    if (quota.used >= quota.limit) return errorResponse(429, 'QUOTA_EXCEEDED', `You've used all ${DAILY_LIMIT} AI plans for today.`);
    if (import.meta.env.MODE !== 'test') await new Promise((resolve) => setTimeout(resolve, 1200));

    const destination = db.destinations.find((d) => d.name.toLowerCase() === req.destination.trim().toLowerCase());
    const stored: StoredItinerary = { ...generateItinerary(req, destination), region: regionOf(destination), id: newId('it'), createdAt: new Date().toISOString(), ownerId: user.id };
    db.itineraries.unshift(stored);
    db.generations[user.id] = { day: today(), used: quota.used + 1 };
    saveTrips();
    return HttpResponse.json({ itinerary: publicTrip(stored), quota: quotaFor(user.id) });
  }),

  // POST /itineraries/generate/stream — the same plan, sent as JSON lines: meta, then each
  // day a moment apart (so the page can show them arriving), then done.
  http.post(apiUrl('/itineraries/generate/stream'), async ({ request }) => {
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const req = (await request.json()) as TripRequest;
    if (req.destination.trim().toLowerCase() === 'fail-ai') return errorResponse(503, 'AI_UNAVAILABLE', 'Both AI planners are busy — try again in a minute.');
    const quota = quotaFor(user.id);
    if (quota.used >= quota.limit) return errorResponse(429, 'QUOTA_EXCEEDED', `You've used all ${DAILY_LIMIT} AI plans for today.`);

    const destination = db.destinations.find((d) => d.name.toLowerCase() === req.destination.trim().toLowerCase());
    const stored: StoredItinerary = { ...generateItinerary(req, destination), region: regionOf(destination), id: newId('it'), createdAt: new Date().toISOString(), ownerId: user.id };
    // Short pauses in tests, a believable pace in the browser.
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 40 : ms));
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        await pause(700);
        send({ type: 'meta', title: stored.title, summary: stored.summary });
        for (const day of stored.days) {
          await pause(450);
          send({ type: 'day', day });
        }
        await pause(400);
        // Save only at the end, like the real API.
        db.itineraries.unshift(stored);
        db.generations[user.id] = { day: today(), used: quota.used + 1 };
        saveTrips();
        send({ type: 'done', itinerary: publicTrip(stored), quota: quotaFor(user.id) });
        controller.close();
      },
    });
    return new HttpResponse(body, { headers: { 'Content-Type': 'application/x-ndjson' } });
  }),

  // GET /itineraries — newest first, only the caller's.
  http.get(apiUrl('/itineraries'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    return HttpResponse.json({ itineraries: db.itineraries.filter((t) => t.ownerId === user.id).map(publicTrip) });
  }),

  // GET /itineraries/:id
  http.get(apiUrl('/itineraries/:id'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const trip = ownTrip(user.id, params.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    return HttpResponse.json({ itinerary: publicTrip(trip) });
  }),

  // DELETE /itineraries/:id
  http.delete(apiUrl('/itineraries/:id'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const trip = ownTrip(user.id, params.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    db.itineraries = db.itineraries.filter((t) => t !== trip);
    // Its journal and photos go with it.
    const journal = db.journals.find((j) => j.itineraryId === trip.id);
    for (const photo of journal?.photos ?? []) delete db.photos[photo.id];
    db.journals = db.journals.filter((j) => j !== journal);
    saveTrips();
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /itineraries/:id/days/:n/regenerate — a fresh take on one day (doesn't use quota).
  http.post(apiUrl('/itineraries/:id/days/:n/regenerate'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const trip = ownTrip(user.id, params.id);
    const n = Number(params.n);
    if (!trip || !trip.days[n - 1]) return errorResponse(404, 'NOT_FOUND', "We couldn't find that day.");
    const destination = db.destinations.find((d) => d.name.toLowerCase() === trip.request.destination.trim().toLowerCase());
    trip.variants = (trip.variants ?? 0) + 1;
    trip.days[n - 1] = buildDay(trip.request, destination, trip.days[n - 1].date, n, trip.variants);
    saveTrips();
    return HttpResponse.json({ itinerary: publicTrip(trip) });
  }),

  // POST /itineraries/:id/share — create (or reuse) the public share id.
  http.post(apiUrl('/itineraries/:id/share'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const trip = ownTrip(user.id, params.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    trip.shareId ??= newId('sh');
    saveTrips();
    return HttpResponse.json({ shareId: trip.shareId });
  }),

  // GET /share/:shareId — public, read-only.
  http.get(apiUrl('/share/:shareId'), async ({ params }) => {
    await latency();
    const trip = db.itineraries.find((t) => t.shareId && t.shareId === params.shareId);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "This shared trip isn't available.");
    return HttpResponse.json({ itinerary: publicTrip(trip) });
  }),

  // GET /me/quota
  http.get(apiUrl('/me/quota'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    return HttpResponse.json({ quota: quotaFor(user.id) });
  }),
];
