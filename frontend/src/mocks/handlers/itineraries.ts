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
import { planLocalTrip } from '@planner';
import { buildDay, generateItinerary, tripDates } from '../data/generator';
import { seedPlaces } from '../data/destinations';
import { db, saveTrips, type StoredItinerary } from '../db';
import { currentUser, errorResponse, latency } from './shared';
import { checkToliPlanner, linkSahyatra, toliAccess } from './tolis';

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

/** Strip the owner field before sending a trip out (mock trips are AI-written unless they say otherwise). */
function publicTrip({ ownerId: _ownerId, ...itinerary }: StoredItinerary): Itinerary {
  return { source: 'ai', ...itinerary };
}

/** A trip the caller may see (their own, or their Toli's Sahyatra) and whether they may change it; null otherwise. */
function findTrip(userId: string, id: unknown) {
  const trip = db.itineraries.find((t) => t.id === id);
  if (!trip) return null;
  const access = toliAccess(trip, userId);
  return access.read ? { trip, change: access.change } : null;
}

/** A trip the caller may change: the trip, or the error to send (404 strangers, 403 Sahyatris). */
function changeableTrip(userId: string, id: unknown) {
  const found = findTrip(userId, id);
  if (!found) return { error: errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.") };
  if (!found.change) return { error: errorResponse(403, 'FORBIDDEN', 'Only the Sutradhar and Sah-Sutradhars can change the Sahyatra — suggest it instead.') };
  return { trip: found.trip };
}

/** A catalogue place's world ('abroad' outside India); unknown places have none. */
function regionOf(destination: Destination | undefined): Itinerary['region'] {
  if (!destination) return null;
  return destination.country === 'India' ? (destination.region ?? null) : 'abroad';
}

/** Lower-case letters and digits only, for comparing place names. */
const plain = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

/** The catalogue destination a typed place means ("Hampi", "Hampi, Karnataka"), like the real API's lookup. */
function catalogueDestination(text: string): Destination | undefined {
  const wanted = new Set([plain(text), plain(text.split(',')[0])]);
  return db.destinations.find((d) => wanted.has(plain(d.name)) || wanted.has(plain(d.slug.replace(/-/g, ' '))));
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
    // Planning a Toli's Sahyatra: leaders only.
    const toliError = checkToliPlanner(req.toliId, user.id);
    if (toliError) return toliError;
    if (req.destination.trim().toLowerCase() === 'fail-ai') return errorResponse(503, 'AI_UNAVAILABLE', 'Both AI planners are busy — try again in a minute.');
    const quota = quotaFor(user.id);
    if (quota.used >= quota.limit) return errorResponse(429, 'QUOTA_EXCEEDED', `You've used all ${DAILY_LIMIT} AI plans for today.`);
    if (import.meta.env.MODE !== 'test') await new Promise((resolve) => setTimeout(resolve, 1200));

    const destination = db.destinations.find((d) => d.name.toLowerCase() === req.destination.trim().toLowerCase());
    const stored: StoredItinerary = { ...generateItinerary(req, destination), region: regionOf(destination), id: newId('it'), createdAt: new Date().toISOString(), ownerId: user.id };
    db.itineraries.unshift(stored);
    linkSahyatra(req.toliId, stored, user.id);
    db.generations[user.id] = { day: today(), used: quota.used + 1 };
    saveTrips();
    return HttpResponse.json({ itinerary: publicTrip(stored), quota: quotaFor(user.id) });
  }),

  // POST /itineraries/quick — TripWise's own plan from the catalogue (the backend's planner,
  // run here): no AI, no quota; NO_CATALOGUE for places it doesn't know enough about.
  http.post(apiUrl('/itineraries/quick'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const req = (await request.json()) as TripRequest;
    // Planning a Toli's Sahyatra: leaders only.
    const toliError = checkToliPlanner(req.toliId, user.id);
    if (toliError) return toliError;
    const destination = catalogueDestination(req.destination);
    const local =
      destination?.country === 'India'
        ? planLocalTrip(req, { name: destination.name, region: destination.region, avgDailyCost: destination.avgDailyCost.amount }, seedPlaces.filter((p) => p.destination === destination.slug))
        : null;
    if (!local) return errorResponse(404, 'NO_CATALOGUE', `TripWise doesn't know enough places in ${req.destination} for a quick plan yet — try the AI planner tomorrow.`);
    const dates = tripDates(req.startDate, req.endDate);
    const { stay, food, transport, activities } = local.breakdown;
    const stored: StoredItinerary = {
      id: newId('it'),
      request: req,
      title: local.title,
      summary: local.summary,
      days: local.days.map((day, i) => ({ dayNumber: i + 1, date: dates[i], theme: day.theme, activities: day.activities })),
      estimatedCost: { total: stay + food + transport + activities, breakdown: local.breakdown, currency: 'INR' },
      tips: local.tips,
      packingList: local.packingList,
      provider: 'tripwise',
      source: 'local',
      region: regionOf(destination),
      createdAt: new Date().toISOString(),
      ownerId: user.id,
    };
    db.itineraries.unshift(stored);
    linkSahyatra(req.toliId, stored, user.id);
    saveTrips();
    return HttpResponse.json({ itinerary: publicTrip(stored), quota: quotaFor(user.id) });
  }),

  // POST /itineraries/generate/stream — the same plan, sent as JSON lines: meta, then each
  // day a moment apart (so the page can show them arriving), then done.
  http.post(apiUrl('/itineraries/generate/stream'), async ({ request }) => {
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const req = (await request.json()) as TripRequest;
    // Planning a Toli's Sahyatra: leaders only.
    const toliError = checkToliPlanner(req.toliId, user.id);
    if (toliError) return toliError;
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
    linkSahyatra(req.toliId, stored, user.id);
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
    return HttpResponse.json({ itineraries: db.itineraries.filter((t) => toliAccess(t, user.id).read).map(publicTrip) });
  }),

  // GET /itineraries/:id
  http.get(apiUrl('/itineraries/:id'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const found = findTrip(user.id, params.id);
    if (!found) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    return HttpResponse.json({ itinerary: publicTrip(found.trip) });
  }),

  // DELETE /itineraries/:id
  http.delete(apiUrl('/itineraries/:id'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const { trip, error } = changeableTrip(user.id, params.id);
    if (!trip) return error;
    db.itineraries = db.itineraries.filter((t) => t !== trip);
    // A deleted Sahyatra leaves its Toli without a plan.
    for (const toli of db.tolis) if (toli.tripId === trip.id) toli.tripId = null;
    // Its journal and photos, and Ask TripWise conversations about it, go with it.
    for (const key of Object.keys(db.tripChats)) if (key.startsWith(`${trip.id}|`)) delete db.tripChats[key];
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
    const { trip, error } = changeableTrip(user.id, params.id);
    if (!trip) return error;
    const n = Number(params.n);
    if (!trip.days[n - 1]) return errorResponse(404, 'NOT_FOUND', "We couldn't find that day.");
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
    const { trip, error } = changeableTrip(user.id, params.id);
    if (!trip) return error;
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
