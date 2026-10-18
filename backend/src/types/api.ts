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
  provider: 'gemini' | 'groq';
  /** 'ai' = written for this trip; 'cache' = re-used from a similar trip. */
  source?: 'ai' | 'cache';
  createdAt: string;
}

/** Today's AI allowance. */
export interface Quota {
  used: number;
  limit: number;
  /** ISO time when `used` goes back to 0 (midnight India time). */
  resetsAt: string;
}
