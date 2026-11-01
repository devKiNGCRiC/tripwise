/**
 * itineraries.ts (routes) — the traveller's trips (login required), under /api/itineraries:
 *
 *   POST   /generate                 plan a trip with AI          → { itinerary, quota }
 *   POST   /generate/stream          the same, sent day by day     → one JSON event per line
 *   POST   /quick                    TripWise's own plan, no AI    → { itinerary, quota }
 *   GET    /                         my trips + my Tolis' Sahyatras → { itineraries }
 *   GET    /:id                      one of my trips              → { itinerary }
 *   DELETE /:id                      delete it                    → 204
 *   POST   /:id/days/:n/regenerate   a fresh idea for one day     → { itinerary }
 *   POST   /:id/share                make (or reuse) a share link → { shareId }
 *
 * Someone else's trip always answers 404, so we never reveal that it exists. A Toli's trip
 * (its Sahyatra) is readable by every Sahyatri and changed only by its leaders (403 for
 * the rest); generate/quick with `toliId` plan it (leaders only).
 * AI calls reserve today's allowance first and give it back if the AI fails. Similar trips
 * are served from the plan cache (services/cache.ts) without using the allowance.
 * AI plans are grounded in the places catalogue (services/places.ts); when every AI model is
 * down, catalogue destinations are planned by TripWise's own planner instead (free).
 */
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { PLANS } from '../config/plans.js';
import { Itinerary, Journal, Toli, type ItineraryDoc, type ToliDoc } from '../db/models/index.js';
import { publicItinerary } from '../db/toPublic.js';
import { AppError, forbidden, noCatalogue, notFound, quotaExceeded } from '../lib/errors.js';
import { tripDates } from '../lib/dates.js';
import { currentUser, requireAuth, type AuthUser } from '../middleware/auth.js';
import { generateLimiter } from '../middleware/rateLimit.js';
import { ClientGone, type AiChain } from '../services/ai/chain.js';
import { createTripStreamParser } from '../services/ai/partialJson.js';
import type { AiDay } from '../services/ai/schema.js';
import { dayPrompt, tripPrompt } from '../services/ai/prompt.js';
import { parseDay, parseTrip } from '../services/ai/validate.js';
import { buildItinerary } from '../services/buildItinerary.js';
import type { LocalTrip } from '../services/localPlanner.js';
import { groundingFor, localTripFor, matchPlaces } from '../services/places.js';
import { addToCache, cacheKey, pickCached } from '../services/cache.js';
import type { PhotoStore } from '../services/photos.js';
import { getQuota, nextIstMidnight, refund, reserve } from '../services/quota.js';
import { regionFor } from '../services/region.js';
import { loadMember, logActivity, requireLeader } from '../services/tolis.js';
import { isLeader, type ToliRole } from '../services/toliRules.js';
import { parseTripRequest } from '../services/tripRequest.js';
import type { Pace, Quota, TripRequest } from '../types/api.js';

/** "We couldn't find that trip." — also for other people's trips. */
const TRIP_NOT_FOUND = "We couldn't find that trip.";

/** A trip and whether the user may change it. */
type Access = { trip: ItineraryDoc; canChange: boolean };

/**
 * A trip the user may see: their own, or the Sahyatra of a Toli they're in (leaders may
 * change it; Sahyatris may only read). Null for bad ids, missing trips and everyone else's.
 */
async function findTrip(id: string, user: AuthUser): Promise<Access | null> {
  if (!isValidObjectId(id)) return null;
  const trip = await Itinerary.findById(id);
  if (!trip) return null;
  if (trip.toliId) {
    const toli = await Toli.findById(trip.toliId, { members: 1 }).lean();
    const member = toli?.members.find((m) => m.userId.toString() === user.id);
    if (member) return { trip, canChange: isLeader(member.role as ToliRole) };
  }
  return trip.ownerId.toString() === user.id ? { trip, canChange: true } : null;
}

/** A trip the user may change: 404 for strangers, 403 for a Toli's Sahyatris. */
async function findChangeable(id: string, user: AuthUser): Promise<ItineraryDoc> {
  const access = await findTrip(id, user);
  if (!access) throw notFound(TRIP_NOT_FOUND);
  if (!access.canChange) throw forbidden('Only the Sutradhar and Sah-Sutradhars can change the Sahyatra — suggest it instead.');
  return access.trip;
}

/** The Toli a planning request is for (`toliId` in the body): leaders only; null for a solo trip. */
async function toliFor(body: unknown, user: AuthUser): Promise<ToliDoc | null> {
  const toliId = (body as { toliId?: unknown } | null)?.toliId;
  if (toliId === undefined || toliId === null) return null;
  const { toli, member } = await loadMember(String(toliId), user.id);
  requireLeader(member, 'Only the Sutradhar and Sah-Sutradhars can plan the Sahyatra.');
  return toli;
}

/** Make a newly planned trip the Toli's Sahyatra (nothing to do for a solo trip). */
async function linkSahyatra(toli: ToliDoc | null, trip: ItineraryDoc, actorId: string, now: Date) {
  if (!toli) return;
  trip.toliId = toli._id.toString();
  await trip.save();
  toli.tripId = trip._id.toString();
  await toli.save();
  await logActivity(toli._id.toString(), actorId, 'planned', { tripId: trip._id.toString(), title: trip.title }, now);
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

/** Did every AI model fail (as opposed to a bad request or the traveller leaving)? */
const isAiDown = (error: unknown) => error instanceof AppError && error.code === 'AI_UNAVAILABLE';

/** Save a trip from TripWise's own planner. */
async function saveLocalTrip(local: LocalTrip, tripRequest: TripRequest, ownerId: string) {
  return Itinerary.create(
    buildItinerary(local, tripRequest, { region: await regionFor(tripRequest.destination, local.region), ownerId, provider: 'tripwise', source: 'local' }),
  );
}

/** The itinerary routes. */
export function itineraryRoutes(deps: { ai: AiChain; now: () => Date; photos: PhotoStore }): Router {
  const router = Router();
  const auth = requireAuth(deps.now);
  const limiter = generateLimiter();

  // POST /itineraries/generate — plan a new trip with AI.
  router.post('/itineraries/generate', auth, limiter, async (req, res) => {
    const user = currentUser(req);
    const now = deps.now();
    const tripRequest = parseTripRequest(req.body, now, PLANS[user.plan].maxDays);
    // Planning for a Toli? Only its leaders may (null for a solo trip).
    const toli = await toliFor(req.body, user);
    const key = cacheKey(tripRequest);
    // Real places at this destination: a shortlist for the AI, and all of them to link stops to.
    const grounding = await groundingFor(tripRequest.destination, tripRequest.interests);

    // A similar trip was planned before: re-use one of those plans (instant and free).
    const cached = await pickCached(key, user.id);
    if (cached) {
      const trip = await Itinerary.create(
        buildItinerary(cached.trip, tripRequest, {
          region: await regionFor(tripRequest.destination, cached.trip.region),
          ownerId: user.id,
          provider: cached.provider,
          source: 'cache',
          cacheVariantId: cached.variantId,
          places: grounding.all,
        }),
      );
      // A Toli's plan becomes its Sahyatra.
      await linkSahyatra(toli, trip, user.id, now);
      res.json({ itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
      return;
    }

    // Take one plan from today's allowance (given back below if anything fails).
    if (!(await reserve(user.id, user.plan, 'plans', now))) {
      throw quotaExceeded(`You've used all ${PLANS[user.plan].plansPerDay} AI plans for today.`);
    }
    let trip;
    try {
      const { value, provider } = await deps.ai.run(tripPrompt(tripRequest, grounding.shortlist), (text) => parseTrip(text, tripRequest));
      // Keep the new plan for similar trips later (while the pool has room).
      const cacheVariantId = (await addToCache(key, value, provider)) ?? undefined;
      trip = await Itinerary.create(
        buildItinerary(value, tripRequest, { region: await regionFor(tripRequest.destination, value.region), ownerId: user.id, provider, source: 'ai', cacheVariantId, places: grounding.all }),
      );
    } catch (error) {
      // Nothing was saved: give today's plan back.
      await refund(user.id, 'plans', now);
      // Every AI model is down: plan it ourselves from the catalogue (free), if we know the place.
      const local = isAiDown(error) ? await localTripFor(tripRequest) : null;
      if (!local) throw error;
      trip = await saveLocalTrip(local, tripRequest, user.id);
    }
    // A Toli's plan becomes its Sahyatra.
    await linkSahyatra(toli, trip, user.id, now);
    res.json({ itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
  });

  // POST /itineraries/quick — TripWise's own planner, no AI: free and unlimited, for
  // destinations in the catalogue (404 NO_CATALOGUE elsewhere).
  router.post('/itineraries/quick', auth, limiter, async (req, res) => {
    const user = currentUser(req);
    const now = deps.now();
    const tripRequest = parseTripRequest(req.body, now, PLANS[user.plan].maxDays);
    // Planning for a Toli? Only its leaders may (null for a solo trip).
    const toli = await toliFor(req.body, user);
    const local = await localTripFor(tripRequest);
    if (!local) throw noCatalogue(`TripWise doesn't know enough places in ${tripRequest.destination} for a quick plan yet — try the AI planner tomorrow.`);
    const trip = await saveLocalTrip(local, tripRequest, user.id);
    // A Toli's plan becomes its Sahyatra.
    await linkSahyatra(toli, trip, user.id, now);
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
    // Planning for a Toli? Only its leaders may (null for a solo trip).
    const toli = await toliFor(req.body, user);
    const key = cacheKey(tripRequest);
    const dates = tripDates(tripRequest.startDate, tripRequest.endDate);
    // Real places at this destination: a shortlist for the AI, and all of them to link stops to.
    const grounding = await groundingFor(tripRequest.destination, tripRequest.interests);

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
        buildItinerary(cached.trip, tripRequest, {
          region: await regionFor(tripRequest.destination, cached.trip.region),
          ownerId: user.id,
          provider: cached.provider,
          source: 'cache',
          cacheVariantId: cached.variantId,
          places: grounding.all,
        }),
      );
      open();
      send({ type: 'meta', title: cached.trip.title, summary: cached.trip.summary });
      cached.trip.days.forEach((day, index) => send(dayEvent(day, index)));
      // A Toli's plan becomes its Sahyatra.
      await linkSahyatra(toli, trip, user.id, now);
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
      const { value, provider } = await deps.ai.run(tripPrompt(tripRequest, grounding.shortlist), (text) => parseTrip(text, tripRequest), {
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
      const trip = await Itinerary.create(
        buildItinerary(value, tripRequest, { region: await regionFor(tripRequest.destination, value.region), ownerId: user.id, provider, source: 'ai', cacheVariantId, places: grounding.all }),
      );
      saved = true;
      // A Toli's plan becomes its Sahyatra.
      await linkSahyatra(toli, trip, user.id, now);
      send({ type: 'done', itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
    } catch (error) {
      if (error instanceof ClientGone) return;
      // Every AI model is down: plan it ourselves from the catalogue (free), if we know the place.
      const local = isAiDown(error) ? await localTripFor(tripRequest) : null;
      if (local) {
        const trip = await saveLocalTrip(local, tripRequest, user.id);
        // The AI plan wasn't used: give it back now (and not again below).
        await refund(user.id, 'plans', now);
        saved = true;
        // Anything the AI showed before failing goes; the whole local plan replaces it.
        send({ type: 'reset' });
        send({ type: 'meta', title: local.title, summary: local.summary });
        publicItinerary(trip).days.forEach((day) => send({ type: 'day', day }));
        // A Toli's plan becomes its Sahyatra.
        await linkSahyatra(toli, trip, user.id, now);
        send({ type: 'done', itinerary: publicItinerary(trip), quota: await quotaAfterSave(user, now) });
        return;
      }
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

  // GET /itineraries — my trips and my Tolis' Sahyatras, newest first.
  router.get('/itineraries', auth, async (req, res) => {
    const me = currentUser(req).id;
    const tolis = await Toli.find({ 'members.userId': me }, { _id: 1 }).lean();
    const trips = await Itinerary.find({ $or: [{ ownerId: me }, { toliId: { $in: tolis.map((t) => t._id.toString()) } }] }).sort({ createdAt: -1, _id: -1 });
    res.json({ itineraries: trips.map(publicItinerary) });
  });

  // GET /itineraries/:id — one of my trips, or my Toli's Sahyatra.
  router.get('/itineraries/:id', auth, async (req, res) => {
    const access = await findTrip(String(req.params.id), currentUser(req));
    if (!access) throw notFound(TRIP_NOT_FOUND);
    res.json({ itinerary: publicItinerary(access.trip) });
  });

  // DELETE /itineraries/:id — delete one of my trips (a Sahyatra: leaders only).
  router.delete('/itineraries/:id', auth, async (req, res) => {
    const trip = await findChangeable(String(req.params.id), currentUser(req));
    // A deleted Sahyatra leaves its Toli without a plan.
    if (trip.toliId) await Toli.updateOne({ _id: trip.toliId, tripId: trip._id.toString() }, { tripId: null });
    // Its journal and photos go with it.
    const journal = await Journal.findOneAndDelete({ itineraryId: trip._id }).lean();
    await Promise.all((journal?.photos ?? []).map((p) => deps.photos.remove(p.id)));
    await trip.deleteOne();
    res.status(204).end();
  });

  // POST /itineraries/:id/days/:n/regenerate — a fresh idea for one day.
  // (No per-minute limit here: the daily cap of fresh ideas already bounds it.)
  router.post('/itineraries/:id/days/:n/regenerate', auth, async (req, res) => {
    const user = currentUser(req);
    const now = deps.now();
    const trip = await findChangeable(String(req.params.id), user);
    const dayNumber = Number(req.params.n);
    const current = Number.isInteger(dayNumber) ? trip.days[dayNumber - 1] : undefined;
    if (!current) throw notFound("We couldn't find that day.");

    if (!(await reserve(user.id, user.plan, 'regens', now))) throw quotaExceeded("You've used today's fresh ideas — try again tomorrow.");
    try {
      const request = trip.request as unknown as TripRequest;
      const otherDays = trip.days.map((day) => ({ theme: day.theme, activities: day.activities as never }));
      const grounding = await groundingFor(request.destination, request.interests);
      const { value } = await deps.ai.run(dayPrompt(request, otherDays, dayNumber, grounding.shortlist), (text) => parseDay(text, request.pace as Pace));
      // Replace just this day; its number and date stay the same; stops at catalogue places are linked.
      trip.set(`days.${dayNumber - 1}`, { dayNumber, date: current.date, theme: value.theme, activities: matchPlaces(value.activities, grounding.all, request.destination) });
      await trip.save();
      res.json({ itinerary: publicItinerary(trip) });
    } catch (error) {
      await refund(user.id, 'regens', now);
      throw error;
    }
  });

  // POST /itineraries/:id/share — create the public link once, then keep returning it.
  router.post('/itineraries/:id/share', auth, async (req, res) => {
    const trip = await findChangeable(String(req.params.id), currentUser(req));
    if (!trip.shareId) {
      // 9 random bytes → 12 URL-safe characters: impossible to guess.
      trip.shareId = randomBytes(9).toString('base64url');
      await trip.save();
    }
    res.json({ shareId: trip.shareId });
  });

  return router;
}
