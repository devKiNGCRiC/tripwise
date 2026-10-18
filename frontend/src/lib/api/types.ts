/**
 * types.ts — the data contract between frontend and backend.
 *
 * These shapes are copied from the design spec (§5). The mock API (src/mocks)
 * and the real Express backend MUST both return exactly these shapes, which is
 * what lets us switch from mock to real by flipping one env variable.
 */

/* ── Users & auth ─────────────────────────────────────────────────────── */

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  /** Which plan the account is on (decides daily limits). */
  plan?: 'free' | 'premium';
  /** ISO date string, e.g. "2026-10-02T09:00:00.000Z" */
  createdAt: string;
  blocked: boolean;
}

/** Returned by login / signup / google: who you are + a short-lived access token. */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

/* ── Destinations ─────────────────────────────────────────────────────── */

export type Vibe = 'beach' | 'mountains' | 'culture' | 'party' | 'adventure' | 'spiritual' | 'food' | 'nature' | 'city' | 'romantic';

export type BudgetTier = 'budget' | 'mid' | 'luxury';

/** Money is always amount + ISO currency code, e.g. { amount: 3500, currency: "INR" }. */
export interface Money {
  amount: number;
  currency: string;
}

export interface Destination {
  id: string;
  /** URL-friendly name used in /destinations/:slug, e.g. "goa" */
  slug: string;
  name: string;
  /** The name in Hindi (Devanagari), e.g. "गोवा". */
  localName?: string;
  /** Which of India's seven worlds it belongs to (pages show that living landscape). Absent abroad. */
  region?: 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters';
  country: string;
  vibes: Vibe[];
  budgetTier: BudgetTier;
  /** Best months to visit, 1 = January … 12 = December */
  bestMonths: number[];
  summary: string;
  highlights: string[];
  avgDailyCost: Money;
  image: { url: string; credit: string; creditUrl: string };
}

/** Optional filters for GET /destinations. */
export interface DestinationFilters {
  vibe?: Vibe;
  budget?: BudgetTier;
  month?: number;
  q?: string;
}

/* ── Itineraries (used from Plan 2 onward) ────────────────────────────── */

export type Interest = 'food' | 'culture' | 'adventure' | 'nightlife' | 'nature' | 'shopping' | 'history' | 'relaxation' | 'photography' | 'spiritual';

export type Travellers = 'solo' | 'couple' | 'friends' | 'family';

export type Pace = 'chill' | 'balanced' | 'packed';

/** Everything the user tells the planner. */
export interface TripRequest {
  destination: string;
  /** ISO dates "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  budget: Money;
  travellers: Travellers;
  interests: Interest[];
  pace: Pace;
}

/** How you get from one activity to the next. */
export type TransferMode = 'walk' | 'auto' | 'cab' | 'bus' | 'train' | 'boat';

export interface Activity {
  time: 'morning' | 'afternoon' | 'evening';
  /** Planned start, 24-hour "HH:MM" */
  startTime?: string;
  title: string;
  description: string;
  location?: string;
  estCost?: number;
  /** Getting to the NEXT activity (absent on the day's last one) */
  transfer?: { mode: TransferMode; minutes: number };
}

export interface Day {
  dayNumber: number;
  date: string;
  theme: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  /** Present once the user creates a public share link. */
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
  /** Which AI wrote it — shown in admin stats. */
  provider: 'gemini' | 'groq';
  /** 'ai' = written for this trip; 'cache' = re-used from a similar trip (instant, free). */
  source?: 'ai' | 'cache';
  createdAt: string;
}

/** Daily AI-generation allowance. */
export interface Quota {
  used: number;
  limit: number;
  /** ISO time when `used` resets to 0 */
  resetsAt: string;
}

/** Response of POST /itineraries/generate. */
export interface GenerateResponse {
  itinerary: Itinerary;
  quota: Quota;
}

/**
 * One line of POST /itineraries/generate/stream: the trip arrives piece by piece.
 * `reset` means a model failed part-way and another starts over (drop what was shown).
 */
export type GenerateEvent =
  | { type: 'meta'; title: string; summary: string }
  | { type: 'day'; day: Day }
  | { type: 'reset' }
  | { type: 'done'; itinerary: Itinerary; quota: Quota }
  | { type: 'error'; error: { code: ApiErrorCode; message: string } };

/* ── Errors ───────────────────────────────────────────────────────────── */

/** Machine-readable error codes. NETWORK is client-side only (server unreachable). */
export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'AI_UNAVAILABLE'
  | 'SERVER'
  | 'NETWORK';

/** Shape of every error response body from the API. */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}
