/**
 * db.ts — the mock backend's in-memory "database".
 *
 * Data lives in plain arrays (reset on page reload). The login SESSION is the
 * one thing we persist — in localStorage — to imitate the real backend's
 * httpOnly refresh cookie, so a page refresh keeps you logged in during demos.
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

/** Fresh deep copies of the seed data, so tests can mutate freely. */
function createDb(): MockDb {
  return {
    users: structuredClone(seedUsers),
    destinations: structuredClone(seedDestinations),
    itineraries: [],
    generations: {},
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
  return rest;
}
