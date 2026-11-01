/**
 * api.ts — the data shapes the API sends and receives.
 * A copy of the contract in frontend/src/lib/api/types.ts: both sides MUST agree, which is
 * what lets the website switch from its mock to this real API with one setting.
 */

/** Ways a trip can feel. */
export type Interest = 'food' | 'culture' | 'adventure' | 'nightlife' | 'nature' | 'shopping' | 'history' | 'relaxation' | 'photography' | 'spiritual';
/** Who is travelling. */
export type Travellers = 'solo' | 'couple' | 'friends' | 'family';
/** How full each day is. */
export type Pace = 'chill' | 'balanced' | 'packed';
/** How you get from one stop to the next. */
export type TransferMode = 'walk' | 'auto' | 'cab' | 'bus' | 'train' | 'boat';

/** Money: an amount plus an ISO currency code. */
export interface Money {
  amount: number;
  currency: string;
}

/** Everything the traveller tells the planner. */
export interface TripRequest {
  destination: string;
  /** "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  /** Per person per day. */
  budget: Money;
  travellers: Travellers;
  interests: Interest[];
  pace: Pace;
}

/** One thing to do. */
export interface Activity {
  time: 'morning' | 'afternoon' | 'evening';
  /** "HH:MM", 24-hour */
  startTime?: string;
  title: string;
  description: string;
  location?: string;
  estCost?: number;
  /** Getting to the next activity (absent on the day's last one). */
  transfer?: { mode: TransferMode; minutes: number };
  /** The catalogue place this stop is at, when it is one. */
  place?: { id: string; lat: number; lon: number };
}

/** One day of the trip. */
export interface Day {
  dayNumber: number;
  date: string;
  theme: string;
  activities: Activity[];
}

/** A whole trip as the website sees it. */
export interface Itinerary {
  id: string;
  shareId?: string;
  request: TripRequest;
  title: string;
  summary: string;
  days: Day[];
  estimatedCost: {
    total: number;
    breakdown: { stay: number; food: number; transport: number; activities: number };
    currency: string;
  };
  tips: string[];
  packingList: string[];
  /** The Toli this trip is the Sahyatra of (null for a solo trip). */
  toliId?: string | null;
  /** Which model wrote it, or 'tripwise' for TripWise's own planner. */
  provider: 'gemini' | 'groq' | 'tripwise';
  /** 'ai' = written for this trip; 'cache' = re-used from a similar trip; 'local' = TripWise's own planner (no AI). */
  source?: 'ai' | 'cache' | 'local';
  /** Which of India's seven worlds the trip is in ('abroad' outside India; null if unknown). */
  region?: 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters' | 'abroad' | null;
  createdAt: string;
}

/** Today's AI allowance. */
export interface Quota {
  used: number;
  limit: number;
  /** ISO time when `used` goes back to 0 (midnight India time). */
  resetsAt: string;
}
