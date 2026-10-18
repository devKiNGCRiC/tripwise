/**
 * buildItinerary.ts — turns the AI's creative answer into a complete trip record.
 * The server, not the AI, decides the facts: each day's number and date, the total cost
 * (the sum of the breakdown), who owns it and which model wrote it.
 */
import { tripDates } from '../lib/dates.js';
import type { TripRequest } from '../types/api.js';
import type { AiTrip } from './ai/schema.js';

/** Extra facts about where the plan came from. */
export interface BuildMeta {
  ownerId: string;
  provider: 'gemini' | 'groq';
  source: 'ai' | 'cache';
  cacheVariantId?: string;
}

/** The fields to save for a new trip. */
export function buildItinerary(ai: AiTrip, req: TripRequest, meta: BuildMeta) {
  const dates = tripDates(req.startDate, req.endDate);
  const { stay, food, transport, activities } = ai.breakdown;
  return {
    ownerId: meta.ownerId,
    request: req,
    title: ai.title,
    summary: ai.summary,
    days: ai.days.map((day, index) => ({ dayNumber: index + 1, date: dates[index], theme: day.theme, activities: day.activities })),
    estimatedCost: {
      total: Math.round(stay + food + transport + activities),
      breakdown: { stay: Math.round(stay), food: Math.round(food), transport: Math.round(transport), activities: Math.round(activities) },
      currency: 'INR',
    },
    tips: ai.tips,
    packingList: ai.packingList,
    provider: meta.provider,
    source: meta.source,
    ...(meta.cacheVariantId ? { cacheVariantId: meta.cacheVariantId } : {}),
  };
}
