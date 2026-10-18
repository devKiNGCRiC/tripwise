/**
 * itineraries.ts (routes) — the traveller's trips (login required), under /api/itineraries:
 *
 *   POST   /generate                 plan a trip with AI          → { itinerary, quota }
 *   POST   /generate/stream          the same, sent day by day     → one JSON event per line
 *   GET    /                         my trips, newest first       → { itineraries }
 *   GET    /:id                      one of my trips              → { itinerary }
 *   DELETE /:id                      delete it                    → 204
 *   POST   /:id/days/:n/regenerate   a fresh idea for one day     → { itinerary }
 *   POST   /:id/share                make (or reuse) a share link → { shareId }
 *
 * Someone else's trip always answers 404, so we never reveal that it exists.
 * AI calls reserve today's allowance first and give it back if the AI fails. Similar trips
 * are served from the plan cache (services/cache.ts) without using the allowance.
 */
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { PLANS } from '../config/plans.js';
import { Itinerary } from '../db/models/index.js';
import { publicItinerary } from '../db/toPublic.js';
import { AppError, notFound, quotaExceeded } from '../lib/errors.js';
import { tripDates } from '../lib/dates.js';
import { currentUser, requireAuth, type AuthUser } from '../middleware/auth.js';
import { generateLimiter } from '../middleware/rateLimit.js';
import { ClientGone, type AiChain } from '../services/ai/chain.js';
import { createTripStreamParser } from '../services/ai/partialJson.js';
import type { AiDay } from '../services/ai/schema.js';
import { dayPrompt, tripPrompt } from '../services/ai/prompt.js';
import { parseDay, parseTrip } from '../services/ai/validate.js';
import { buildItinerary } from '../services/buildItinerary.js';
import { addToCache, cacheKey, pickCached } from '../services/cache.js';
import { getQuota, nextIstMidnight, refund, reserve } from '../services/quota.js';
import { regionFor } from '../services/region.js';
import { parseTripRequest } from '../services/tripRequest.js';
import type { Pace, Quota, TripRequest } from '../types/api.js';

/** "We couldn't find that trip." — also for other people's trips. */
const TRIP_NOT_FOUND = "We couldn't find that trip.";

/** One of the traveller's own trips, or null (bad id, missing, or someone else's). */
async function findOwned(id: string, user: AuthUser) {
  if (!isValidObjectId(id)) return null;
  return Itinerary.findOne({ _id: id, ownerId: user.id });
}

/**
 * Today's allowance, for answers sent *after* a trip is saved. Reading it is best-effort: a
 * database hiccup here must not turn a saved trip into an error (the traveller would retry
 * and spend a second plan). The website re-reads the quota afterwards anyway.
 */
async function quotaAfterSave(user: AuthUser, now: Date): Promise<Quota> {
  try {
    return await getQuota(user.id, user.plan, now);
  } catch (error) {
    console.error('[api] could not read the quota after saving a trip:', error);
    return { used: 0, limit: PLANS[user.plan].plansPerDay, resetsAt: nextIstMidnight(now).toISOString() };
  }
}

/** The itinerary routes. */
export function itineraryRoutes(deps: { ai: AiChain; now: () => Date }): Router {
  const router = Router();
  const auth = requireAuth(deps.now);
  const limiter = generateLimiter();

  // POST /itineraries/generate — plan a new trip with AI.
  router.post('/itineraries/generate', auth, limiter, async (req, res) => {
    const user = currentUser(req);
    const now = deps.now();
    const tripRequest = parseTripRequest(req.body, now, PLANS[user.plan].maxDays);
    const key = cacheKey(tripRequest);

    // A similar trip was planned before: re-use one of those plans (instant and free).
    const cached = await pickCached(key, user.id);
    if (cached) {
      const trip = await Itinerary.create(
        buildItinerary(cached.trip, tripRequest, { region: await regionFor(tripRequest.destination, cached.trip.region), ownerId: user.id, provider: cached.provider, source: 'cache', cacheVariantId: cached.variantId }),
      );
      res.json({ itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
      return;
    }

    // Take one plan from today's allowance (given back below if anything fails).
    if (!(await reserve(user.id, user.plan, 'plans', now))) {
      throw quotaExceeded(`You've used all ${PLANS[user.plan].plansPerDay} AI plans for today.`);
    }
    let trip;
    try {
      const { value, provider } = await deps.ai.run(tripPrompt(tripRequest), (text) => parseTrip(text, tripRequest));
      // Keep the new plan for similar trips later (while the pool has room).
      const cacheVariantId = (await addToCache(key, value, provider)) ?? undefined;
      trip = await Itinerary.create(buildItinerary(value, tripRequest, { region: await regionFor(tripRequest.destination, value.region), ownerId: user.id, provider, source: 'ai', cacheVariantId }));
    } catch (error) {
      // Nothing was saved: give today's plan back.
      await refund(user.id, 'plans', now);
      throw error;
    }
    res.json({ itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
  });

  // POST /itineraries/generate/stream — the same as /generate, but sent day by day as the
  // AI writes it. Each line of the response is one JSON event:
  //   {type:'meta', title, summary}   {type:'day', day}   {type:'reset'}
  //   and finally {type:'done', itinerary, quota} or {type:'error', error:{code,message}}.
  // Problems found before anything is sent (bad request, no plans left) are normal JSON errors.
  router.post('/itineraries/generate/stream', auth, limiter, async (req, res) => {
    const user = currentUser(req);
    const now = deps.now();
    const tripRequest = parseTripRequest(req.body, now, PLANS[user.plan].maxDays);
    const key = cacheKey(tripRequest);
    const dates = tripDates(tripRequest.startDate, tripRequest.endDate);

    /** Start the event stream (headers go out now, so the page can listen). */
    const open = () => {
      res.status(200);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      // Ask proxies not to hold the stream back.
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
    };
    /** Send one event (if the traveller is still there). */
    const send = (event: object) => {
      if (!res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(event)}\n`);
    };
    /** A day with its number and date filled in. */
    const dayEvent = (day: AiDay, index: number) => ({
      type: 'day',
      day: { dayNumber: index + 1, date: dates[index], theme: day.theme, activities: day.activities },
    });

    // Cached plan: stream it straight away, no AI, no allowance used.
    const cached = await pickCached(key, user.id);
    if (cached) {
      const trip = await Itinerary.create(
        buildItinerary(cached.trip, tripRequest, { region: await regionFor(tripRequest.destination, cached.trip.region), ownerId: user.id, provider: cached.provider, source: 'cache', cacheVariantId: cached.variantId }),
      );
      open();
      send({ type: 'meta', title: cached.trip.title, summary: cached.trip.summary });
      cached.trip.days.forEach((day, index) => send(dayEvent(day, index)));
      send({ type: 'done', itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
      res.end();
      return;
    }

    if (!(await reserve(user.id, user.plan, 'plans', now))) {
      throw quotaExceeded(`You've used all ${PLANS[user.plan].plansPerDay} AI plans for today.`);
    }

    // If the traveller closes the page, cancel the AI (and give the plan back below).
    const leaving = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) leaving.abort();
    });

    open();
    let parser = createTripStreamParser();
    let sentDays = 0;
    let saved = false;
    try {
      const { value, provider } = await deps.ai.run(tripPrompt(tripRequest), (text) => parseTrip(text, tripRequest), {
        signal: leaving.signal,
        // Pass along whatever is complete so far.
        onText(chunk) {
          const update = parser.push(chunk);
          if (update.meta) send({ type: 'meta', ...update.meta });
          for (const day of update.days) send(dayEvent(day, sentDays++));
        },
        // A model failed part-way: the page clears what it showed and we start reading afresh.
        onReset() {
          parser = createTripStreamParser();
          sentDays = 0;
          send({ type: 'reset' });
        },
      });
      const cacheVariantId = (await addToCache(key, value, provider)) ?? undefined;
      const trip = await Itinerary.create(buildItinerary(value, tripRequest, { region: await regionFor(tripRequest.destination, value.region), ownerId: user.id, provider, source: 'ai', cacheVariantId }));
      saved = true;
      send({ type: 'done', itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
    } catch (error) {
      if (error instanceof ClientGone) return;
      const known = error instanceof AppError;
      if (!known) console.error('[api] stream generate failed:', error);
      send({
        type: 'error',
        error: known
          ? { code: error.code, message: error.message }
          : { code: 'SERVER', message: 'Something went wrong on our side. Please try again.' },
      });
    } finally {
      // Nothing saved (AI failed or the traveller left): give today's plan back.
      if (!saved) await refund(user.id, 'plans', now);
      if (!res.writableEnded) res.end();
    }
  });

  // GET /itineraries — my trips, newest first.
  router.get('/itineraries', auth, async (req, res) => {
    const trips = await Itinerary.find({ ownerId: currentUser(req).id }).sort({ createdAt: -1, _id: -1 });
    res.json({ itineraries: trips.map(publicItinerary) });
  });

  // GET /itineraries/:id — one of my trips.
  router.get('/itineraries/:id', auth, async (req, res) => {
    const trip = await findOwned(String(req.params.id), currentUser(req));
    if (!trip) throw notFound(TRIP_NOT_FOUND);
    res.json({ itinerary: publicItinerary(trip) });
  });

  // DELETE /itineraries/:id — delete one of my trips.
  router.delete('/itineraries/:id', auth, async (req, res) => {
    const trip = await findOwned(String(req.params.id), currentUser(req));
    if (!trip) throw notFound(TRIP_NOT_FOUND);
    await trip.deleteOne();
    res.status(204).end();
  });

  // POST /itineraries/:id/days/:n/regenerate — a fresh idea for one day.
  // (No per-minute limit here: the daily cap of fresh ideas already bounds it.)
  router.post('/itineraries/:id/days/:n/regenerate', auth, async (req, res) => {
    const user = currentUser(req);
    const now = deps.now();
    const trip = await findOwned(String(req.params.id), user);
    if (!trip) throw notFound(TRIP_NOT_FOUND);
    const dayNumber = Number(req.params.n);
    const current = Number.isInteger(dayNumber) ? trip.days[dayNumber - 1] : undefined;
    if (!current) throw notFound("We couldn't find that day.");

    if (!(await reserve(user.id, user.plan, 'regens', now))) throw quotaExceeded("You've used today's fresh ideas — try again tomorrow.");
    try {
      const request = trip.request as unknown as TripRequest;
      const otherDays = trip.days.map((day) => ({ theme: day.theme, activities: day.activities as never }));
      const { value } = await deps.ai.run(dayPrompt(request, otherDays, dayNumber), (text) => parseDay(text, request.pace as Pace));
      // Replace just this day; its number and date stay the same.
      trip.set(`days.${dayNumber - 1}`, { dayNumber, date: current.date, theme: value.theme, activities: value.activities });
      await trip.save();
      res.json({ itinerary: publicItinerary(trip) });
    } catch (error) {
      await refund(user.id, 'regens', now);
      throw error;
    }
  });

  // POST /itineraries/:id/share — create the public link once, then keep returning it.
  router.post('/itineraries/:id/share', auth, async (req, res) => {
    const trip = await findOwned(String(req.params.id), currentUser(req));
    if (!trip) throw notFound(TRIP_NOT_FOUND);
    if (!trip.shareId) {
      // 9 random bytes → 12 URL-safe characters: impossible to guess.
      trip.shareId = randomBytes(9).toString('base64url');
      await trip.save();
    }
    res.json({ shareId: trip.shareId });
  });

  return router;
}
