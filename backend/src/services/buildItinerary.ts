/**
 * buildItinerary.ts — turns a planned trip (the AI's answer, or TripWise's own planner's)
 * into a complete trip record.
 * The server, not the AI, decides the facts: each day's number and date, the total cost
 * (the sum of the breakdown), who owns it, which model wrote it, and which stops are
 * catalogue places (with their coordinates).
 */
import { tripDates } from '../lib/dates.js';
import type { TripRequest } from '../types/api.js';
import type { AiActivity, AiTrip } from './ai/schema.js';
import { matchPlaces, type PlanPlace } from './places.js';

/** A planned trip: the AI's answer, or our own planner's (whose stops have no cost guess but know their place). */
export type TripDraft = Omit<AiTrip, 'days'> & {
  days: { theme: string; activities: (Omit<AiActivity, 'estCost'> & { estCost?: number; place?: { id: string; lat: number; lon: number } })[] }[];
};

/** Extra facts about where the plan came from. */
export interface BuildMeta {
  ownerId: string;
  provider: 'gemini' | 'groq' | 'tripwise';
  source: 'ai' | 'cache' | 'local';
  cacheVariantId?: string;
  /** The trip's world (services/region.ts). */
  region?: string | null;
  /** The destination's catalogue places, to link stops to (none outside the catalogue). */
  places?: PlanPlace[];
}

/** The fields to save for a new trip. */
export function buildItinerary(ai: TripDraft, req: TripRequest, meta: BuildMeta) {
  const dates = tripDates(req.startDate, req.endDate);
  const { stay, food, transport, activities } = ai.breakdown;
  return {
    ownerId: meta.ownerId,
    request: req,
    title: ai.title,
    summary: ai.summary,
    days: ai.days.map((day, index) => ({
      dayNumber: index + 1,
      date: dates[index],
      theme: day.theme,
      activities: matchPlaces(day.activities, meta.places ?? [], req.destination),
    })),
    estimatedCost: {
      total: Math.round(stay + food + transport + activities),
      breakdown: { stay: Math.round(stay), food: Math.round(food), transport: Math.round(transport), activities: Math.round(activities) },
      currency: 'INR',
    },
    tips: ai.tips,
    packingList: ai.packingList,
    provider: meta.provider,
    source: meta.source,
    region: meta.region ?? null,
    ...(meta.cacheVariantId ? { cacheVariantId: meta.cacheVariantId } : {}),
  };
}
