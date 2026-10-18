/**
 * itineraries.ts (routes) — the traveller's trips (login required), under /api/itineraries:
 *
 *   POST   /generate                 plan a trip with AI          → { itinerary, quota }
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
import { notFound, quotaExceeded } from '../lib/errors.js';
import { currentUser, requireAuth, type AuthUser } from '../middleware/auth.js';
import { generateLimiter } from '../middleware/rateLimit.js';
import type { AiChain } from '../services/ai/chain.js';
import { dayPrompt, tripPrompt } from '../services/ai/prompt.js';
import { parseDay, parseTrip } from '../services/ai/validate.js';
import { buildItinerary } from '../services/buildItinerary.js';
import { addToCache, cacheKey, pickCached } from '../services/cache.js';
import { getQuota, refund, reserve } from '../services/quota.js';
import { parseTripRequest } from '../services/tripRequest.js';
import type { Pace, TripRequest } from '../types/api.js';

/** "We couldn't find that trip." — also for other people's trips. */
const TRIP_NOT_FOUND = "We couldn't find that trip.";

/** One of the traveller's own trips, or null (bad id, missing, or someone else's). */
async function findOwned(id: string, user: AuthUser) {
  if (!isValidObjectId(id)) return null;
  return Itinerary.findOne({ _id: id, ownerId: user.id });
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
        buildItinerary(cached.trip, tripRequest, { ownerId: user.id, provider: cached.provider, source: 'cache', cacheVariantId: cached.variantId }),
      );
      res.json({ itinerary: publicItinerary(trip), quota: await getQuota(user.id, user.plan, now) });
      return;
    }

    // Take one plan from today's allowance (given back below if anything fails).
    if (!(await reserve(user.id, user.plan, 'plans', now))) {
      throw quotaExceeded(`You've used all ${PLANS[user.plan].plansPerDay} AI plans for today.`);
    }
    try {
      const { value, provider } = await deps.ai.run(tripPrompt(tripRequest), (text) => parseTrip(text, tripRequest));
      // Keep the new plan for similar trips later (while the pool has room).
      const cacheVariantId = (await addToCache(key, value, provider)) ?? undefined;
      const trip = await Itinerary.create(buildItinerary(value, tripRequest, { ownerId: user.id, provider, source: 'ai', cacheVariantId }));
      res.json({ itinerary: publicItinerary(trip), quota: await getQuota(user.id, user.plan, now) });
    } catch (error) {
      await refund(user.id, 'plans', now);
      throw error;
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
