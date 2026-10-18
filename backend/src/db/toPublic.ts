/**
 * toPublic.ts — turns database records into exactly what the website receives.
 * Mongo's `_id` becomes a string `id`; private bookkeeping (owner, password hash, cache
 * ids, version keys) is left out. Shapes match frontend/src/lib/api/types.ts.
 */
import type { Itinerary } from '../types/api.js';
import type { ItineraryDoc, UserDoc } from './models/index.js';

/** The `User` the website sees. */
export interface PublicUser {
  id: string;
  name: string;
  /** "@" handle without the @, e.g. "asharao". */
  username: string;
  /** Present when the traveller has a photo, e.g. "/api/avatars/<id>?v=3". */
  avatarUrl?: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'premium';
  createdAt: string;
  blocked: boolean;
}

/** Where a user's photo is served; the version makes a new photo a new URL (so caches refresh). */
export function avatarUrl(userId: string, version: number): string {
  return `/api/avatars/${userId}?v=${version}`;
}

/** Everything the Account tab shows: the public user plus profile and settings. */
export interface Profile extends PublicUser {
  bio: string;
  travellerType: string | null;
  homeCity: string;
  preferences: { budget?: number; interests?: string[]; pace?: string; travellers?: string };
  privacy: { passport: 'friends' | 'everyone' | 'private'; showJournal: boolean };
  theme: unknown;
  inviteCode: string;
}

/** The signed-in traveller's own profile (never sent about anyone else). */
export function profileOf(user: UserDoc): Profile {
  const prefs = user.preferences ?? {};
  return {
    ...publicUser(user),
    bio: user.bio ?? '',
    travellerType: user.travellerType ?? null,
    homeCity: user.homeCity ?? '',
    preferences: {
      ...(prefs.budget !== undefined && prefs.budget !== null ? { budget: prefs.budget } : {}),
      ...(prefs.interests?.length ? { interests: [...prefs.interests] } : {}),
      ...(prefs.pace ? { pace: prefs.pace } : {}),
      ...(prefs.travellers ? { travellers: prefs.travellers } : {}),
    },
    privacy: { passport: (user.privacy?.passport ?? 'friends') as Profile['privacy']['passport'], showJournal: user.privacy?.showJournal ?? true },
    theme: user.theme ?? null,
    inviteCode: user.inviteCode ?? '',
  };
}

/** A user as the website sees it. */
export function publicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username ?? '',
    ...(user.avatar ? { avatarUrl: avatarUrl(user._id.toString(), user.avatar.version) } : {}),
    email: user.email,
    role: user.role as PublicUser['role'],
    plan: user.plan as PublicUser['plan'],
    createdAt: (user.get('createdAt') as Date).toISOString(),
    blocked: user.blocked,
  };
}

/** A trip as the website sees it. */
export function publicItinerary(trip: ItineraryDoc): Itinerary {
  // toObject drops Mongoose internals; then we pick out only public fields.
  const plain = trip.toObject({ versionKey: false });
  const { _id, ownerId, cacheVariantId, createdAt, shareId, ...rest } = plain;
  void ownerId;
  void cacheVariantId;
  return {
    id: _id.toString(),
    ...(shareId ? { shareId } : {}),
    ...(rest as unknown as Omit<Itinerary, 'id' | 'shareId' | 'createdAt'>),
    createdAt: (createdAt as Date).toISOString(),
  };
}
