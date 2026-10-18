/**
 * cache.ts — re-use AI plans for similar trips.
 *
 * Trips are grouped by a *key*: the place, the number of days, the month, who's going, the
 * pace, the interests and the budget band. For each key we keep up to 3 different AI
 * plans. Once 3 exist, a new request with the same key gets one of them instantly (and it
 * doesn't use the traveller's daily allowance) — but never one that person already got.
 * Plans are stored without dates or owners, and expire after 30 days so they stay fresh.
 */
import { randomUUID } from 'node:crypto';
import { Itinerary, PlanCache } from '../db/models/index.js';
import type { TripRequest } from '../types/api.js';
import { tripDates } from '../lib/dates.js';
import type { AiTrip } from './ai/schema.js';

/** How many different plans are kept per kind of trip. */
export const POOL_SIZE = 3;

/** Per-person daily budget → a coarse band, so ₹3,000 and ₹3,500 share plans. */
export function budgetBand(amountPerDay: number): 'budget' | 'mid' | 'luxury' {
  if (amountPerDay < 2500) return 'budget';
  if (amountPerDay < 7000) return 'mid';
  return 'luxury';
}

/** The "kind of trip" a request belongs to. */
export function cacheKey(req: TripRequest): string {
  const place = req.destination.trim().toLowerCase().replace(/\s+/g, ' ');
  const days = tripDates(req.startDate, req.endDate).length;
  const month = Number(req.startDate.slice(5, 7));
  const interests = [...req.interests].sort().join(',');
  return [place, days, month, req.travellers, req.pace, interests, budgetBand(req.budget.amount)].join('|');
}

/** A cached plan picked for someone. */
export interface CachedPlan {
  trip: AiTrip;
  provider: 'gemini' | 'groq';
  variantId: string;
}

/** A cached plan this traveller hasn't had yet — only once the pool is full; otherwise null. */
export async function pickCached(key: string, userId: string): Promise<CachedPlan | null> {
  const entry = await PlanCache.findOne({ key }).lean();
  if (!entry || entry.variants.length < POOL_SIZE) return null;

  // Which of these plans has this traveller already been given?
  const ids = entry.variants.map((variant) => variant.id);
  const seen = new Set((await Itinerary.distinct('cacheVariantId', { ownerId: userId, cacheVariantId: { $in: ids } })).map(String));
  const fresh = entry.variants.filter((variant) => !seen.has(variant.id));
  if (fresh.length === 0) return null;

  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  return { trip: pick.trip as AiTrip, provider: pick.provider as CachedPlan['provider'], variantId: pick.id };
}

/**
 * Keep a new AI plan for re-use, while the pool has room. Returns its id, or null when the
 * pool is already full. One atomic update: it only matches while fewer than 3 plans exist,
 * so two requests can't overfill the pool.
 */
export async function addToCache(key: string, trip: AiTrip, provider: 'gemini' | 'groq'): Promise<string | null> {
  const id = randomUUID();
  try {
    const result = await PlanCache.updateOne(
      { key, [`variants.${POOL_SIZE - 1}`]: { $exists: false } },
      { $push: { variants: { id, provider, trip } }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    return result.modifiedCount + result.upsertedCount > 0 ? id : null;
  } catch (error) {
    // The pool exists and is full: the upsert's insert hit the unique key.
    if ((error as { code?: number }).code === 11000) return null;
    throw error;
  }
}
