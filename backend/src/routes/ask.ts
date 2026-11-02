/**
 * ask.ts (routes) — Ask TripWise, a question box on every trip (login required):
 *
 *   POST   /api/itineraries/:id/ask   { question } → { reply, quota }
 *   GET    /api/itineraries/:id/ask   → { messages, quota }   my conversation about this trip
 *   DELETE /api/itineraries/:id/ask   → 204                   start over
 *
 * Who can ask: whoever can read the trip (its owner, or any member of its Toli); everyone else
 * gets 404 without using any allowance. Each person's conversation is their own.
 * One question uses one unit of today's allowance (free 20); it is given back when every AI
 * model fails. The answer is grounded in a brief about the trip (services/ask/prompt.ts) with
 * real catalogue places nearby and the forecast (services/ask/weather.ts) when it's close.
 */
import { Router } from 'express';
import { z } from 'zod';
import { PLANS } from '../config/plans.js';
import { Destination, Place, TripChat, type ItineraryDoc } from '../db/models/index.js';
import { notFound, quotaExceeded } from '../lib/errors.js';
import { tripDates } from '../lib/dates.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import type { AiChain } from '../services/ai/chain.js';
import { askPrompt, MAX_QUESTION, parseAnswer, tripBrief, type BriefPlace } from '../services/ask/prompt.js';
import type { Weather } from '../services/ask/weather.js';
import { findDestination } from '../services/places.js';
import { getQuota, refund, reserve } from '../services/quota.js';
import type { TripRequest } from '../types/api.js';
import { findTrip } from './itineraries.js';

/** Messages kept per conversation. */
const KEEP = 30;
/** A question. */
const questionSchema = z.object({ question: z.string().trim().min(1, 'Ask a question.').max(MAX_QUESTION, `Keep questions under ${MAX_QUESTION} characters.`) });

/** A stored message as the website shows it. */
interface StoredMessage {
  role: 'user' | 'assistant';
  text: string;
  placeIds?: string[];
  followUps?: string[];
  weather?: boolean;
  at: Date;
}

/** Messages as the website shows them (place ids become name chips). */
async function messageViews(messages: StoredMessage[]) {
  const ids = [...new Set(messages.flatMap((m) => m.placeIds ?? []))];
  const places = ids.length ? await Place.find({ id: { $in: ids } }, { _id: 0, id: 1, name: 1, destination: 1 }).lean() : [];
  const byId = new Map(places.map((p) => [p.id, p]));
  return messages.map((m) => ({
    role: m.role,
    text: m.text,
    ...(m.placeIds?.length ? { places: m.placeIds.flatMap((id) => (byId.has(id) ? [{ id, name: byId.get(id)!.name, destination: byId.get(id)!.destination }] : [])) } : {}),
    ...(m.followUps?.length ? { followUps: m.followUps } : {}),
    ...(m.weather ? { weatherCredit: true } : {}),
    at: m.at.toISOString(),
  }));
}

/** Everything the brief needs about a trip: catalogue facts, places and the forecast. */
async function briefFor(trip: ItineraryDoc, weather: Weather) {
  const request = trip.request as unknown as TripRequest;
  const found = await findDestination(request.destination);
  const destination = found ? await Destination.findOne({ slug: found.slug }, { _id: 0, name: 1, bestMonths: 1, avgDailyCost: 1, region: 1 }).lean() : null;
  const places = (found ? await Place.find({ destination: found.slug }, { _id: 0, id: 1, name: 1, kind: 1, lat: 1, lon: 1 }).lean() : []) as BriefPlace[];
  // Where to ask the forecast for: the first stop at a catalogue place, else the destination's places.
  const firstStop = trip.days.flatMap((d) => d.activities).find((a) => a.place?.lat !== undefined)?.place;
  const centre = firstStop ?? (places.length ? { lat: places.reduce((s, p) => s + p.lat, 0) / places.length, lon: places.reduce((s, p) => s + p.lon, 0) / places.length } : null);
  const forecast = centre ? await weather.forecast(centre.lat!, centre.lon!, tripDates(request.startDate, request.endDate)) : null;
  const brief = tripBrief({
    request: { ...request, interests: [...request.interests] },
    days: trip.days.map((d) => ({
      dayNumber: d.dayNumber,
      date: d.date,
      theme: d.theme,
      activities: d.activities.map((a) => ({ title: a.title, startTime: a.startTime ?? undefined, estCost: a.estCost ?? undefined, ...(a.place?.id ? { place: { id: a.place.id, lat: a.place.lat!, lon: a.place.lon! } } : {}) })),
    })),
    destination: destination ? { name: destination.name, bestMonths: destination.bestMonths, avgDailyCost: destination.avgDailyCost?.amount, region: destination.region ?? undefined } : null,
    places,
    forecast,
  });
  return { brief, hasForecast: !!forecast };
}

/** The Ask TripWise routes. */
export function askRoutes(deps: { ai: AiChain; now: () => Date; weather: Weather }): Router {
  const router = Router();
  const auth = requireAuth(deps.now);

  /** Today's question allowance for a user. */
  const quotaOf = (userId: string, plan: keyof typeof PLANS) => getQuota(userId, plan, deps.now(), 'asks');

  // GET /itineraries/:id/ask — my conversation about this trip.
  router.get('/itineraries/:id/ask', auth, async (req, res) => {
    const user = currentUser(req);
    const access = await findTrip(String(req.params.id), user);
    if (!access) throw notFound("We couldn't find that trip.");
    const chat = await TripChat.findOne({ tripId: access.trip._id.toString(), userId: user.id }).lean();
    res.json({ messages: await messageViews((chat?.messages ?? []) as StoredMessage[]), quota: await quotaOf(user.id, user.plan) });
  });

  // POST /itineraries/:id/ask — ask a question.
  router.post('/itineraries/:id/ask', auth, async (req, res) => {
    const user = currentUser(req);
    const access = await findTrip(String(req.params.id), user);
    if (!access) throw notFound("We couldn't find that trip.");
    const { question } = questionSchema.parse(req.body);
    const now = deps.now();
    if (!(await reserve(user.id, user.plan, 'asks', now))) throw quotaExceeded(`You've asked today's ${PLANS[user.plan].asksPerDay} questions — more tomorrow.`);

    const tripId = access.trip._id.toString();
    const chat = await TripChat.findOne({ tripId, userId: user.id });
    const history = ((chat?.messages ?? []) as StoredMessage[]).map((m) => ({ role: m.role, text: m.text }));
    let answer: ReturnType<typeof parseAnswer>;
    let hasForecast: boolean;
    try {
      const built = await briefFor(access.trip, deps.weather);
      hasForecast = built.hasForecast;
      const allowed = new Set(built.brief.placeIds);
      answer = (await deps.ai.run(askPrompt(built.brief.text, history, question), (text) => parseAnswer(text, allowed))).value;
    } catch (error) {
      // Every model failed (or something broke): the question is given back.
      await refund(user.id, 'asks', now);
      throw error;
    }

    const asked: StoredMessage = { role: 'user', text: question, at: now };
    const reply: StoredMessage = { role: 'assistant', text: answer.answer, placeIds: answer.placeIds, followUps: answer.followUps, ...(hasForecast ? { weather: true } : {}), at: new Date(now.getTime() + 1) };
    await TripChat.updateOne({ tripId, userId: user.id }, { $push: { messages: { $each: [asked, reply], $slice: -KEEP } } }, { upsert: true });
    res.json({ reply: (await messageViews([reply]))[0], quota: await quotaOf(user.id, user.plan) });
  });

  // DELETE /itineraries/:id/ask — start over.
  router.delete('/itineraries/:id/ask', auth, async (req, res) => {
    const user = currentUser(req);
    const access = await findTrip(String(req.params.id), user);
    if (!access) throw notFound("We couldn't find that trip.");
    await TripChat.deleteOne({ tripId: access.trip._id.toString(), userId: user.id });
    res.status(204).end();
  });

  return router;
}
