/**
 * db.ts — the mock backend's in-memory "database".
 *
 * Data lives in plain arrays. Two things survive a page reload (localStorage), so demos
 * feel real: the login SESSION (standing in for the real backend's httpOnly refresh
 * cookie) and the planned TRIPS with today's AI-plan counts. Tests never persist.
 */
import type { Destination, Itinerary, User } from '@/lib/api/types';
import { seedDestinations } from './data/destinations';
import { seedUsers, type MockUser } from './data/users';

/** A saved trip as the fake database keeps it: plus its owner and how often days were regenerated. */
export interface StoredItinerary extends Itinerary {
  ownerId: string;
  variants?: number;
}

interface MockDb {
  users: MockUser[];
  destinations: Destination[];
  itineraries: StoredItinerary[];
  /** AI plans used per user today */
  generations: Record<string, { day: string; used: number }>;
}

/** localStorage key for saved trips and AI-plan counts. */
const TRIPS_KEY = 'tw_mock_trips';
/** Persist only in the real browser app, never in tests (each test starts clean). */
const PERSIST = import.meta.env.MODE !== 'test';

/** Trips and plan counts saved by an earlier visit (empty if none, unreadable or blocked). */
export function loadSavedTrips(): Pick<MockDb, 'itineraries' | 'generations'> {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TRIPS_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      // Keep only trips that look complete, and plan counts that look like counts.
      const itineraries = Array.isArray(saved.itineraries)
        ? saved.itineraries.filter((t: StoredItinerary | null) => t && typeof t === 'object' && typeof t.id === 'string' && Array.isArray(t.days) && t.request && typeof t.ownerId === 'string')
        : [];
      const generations: MockDb['generations'] = {};
      if (saved.generations && typeof saved.generations === 'object') {
        for (const [user, value] of Object.entries(saved.generations as Record<string, { day?: unknown; used?: unknown }>)) {
          if (value && typeof value.day === 'string' && typeof value.used === 'number') generations[user] = { day: value.day, used: value.used };
        }
      }
      return { itineraries, generations };
    }
  } catch {
    // Corrupt or blocked storage: start fresh.
  }
  return { itineraries: [], generations: {} };
}

/** Save the trips and plan counts (handlers call this after every change). */
export function saveTrips() {
  try {
    window.localStorage.setItem(TRIPS_KEY, JSON.stringify({ itineraries: db.itineraries, generations: db.generations }));
  } catch {
    // Storage full or blocked: trips just won't survive a reload.
  }
}

/** Fresh deep copies of the seed data (plus saved trips in the browser app). */
function createDb(): MockDb {
  return {
    users: structuredClone(seedUsers),
    destinations: structuredClone(seedDestinations),
    ...(PERSIST ? loadSavedTrips() : { itineraries: [], generations: {} }),
  };
}

export const db: MockDb = createDb();

/** Put everything back to the seed state (called after every test). */
export function resetDb() {
  Object.assign(db, createDb());
  session.clear();
}

/** localStorage key standing in for the refresh cookie. */
const SESSION_KEY = 'tw_mock_session';

/** The fake "refresh cookie": which user id is logged in. Never throws (storage may be blocked). */
export const session = {
  get(): string | null {
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  set(userId: string) {
    try {
      window.localStorage.setItem(SESSION_KEY, userId);
    } catch {
      // Storage blocked: session simply won't survive a reload.
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

/** Fake access token format: "mock-access.<userId>". The real API uses signed JWTs. */
export function issueAccessToken(userId: string): string {
  return `mock-access.${userId}`;
}

/** Strip the password before sending a user to the client. */
export function publicUser(user: MockUser): User {
  const { password: _password, ...rest } = user;
  return { plan: 'free', ...rest };
}
