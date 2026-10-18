/**
 * toPublic.ts — turns database records into exactly what the website receives.
 * Mongo's `_id` becomes a string `id`; private bookkeeping (owner, password hash, cache
 * ids, version keys) is left out. Shapes match frontend/src/lib/api/types.ts.
 */
import type { ItineraryDoc, UserDoc } from './models/index.js';

/** The `User` the website sees. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'premium';
  createdAt: string;
  blocked: boolean;
}

/** A user as the website sees it. */
export function publicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as PublicUser['role'],
    plan: user.plan as PublicUser['plan'],
    createdAt: (user.get('createdAt') as Date).toISOString(),
    blocked: user.blocked,
  };
}

/** The `Itinerary` the website sees (types kept loose here; the routes' tests pin the shape). */
export type PublicItinerary = ReturnType<typeof publicItinerary>;

/** A trip as the website sees it. */
export function publicItinerary(trip: ItineraryDoc) {
  // toObject drops Mongoose internals; then we pick out only public fields.
  const plain = trip.toObject({ versionKey: false });
  const { _id, ownerId, cacheVariantId, createdAt, shareId, ...rest } = plain;
  void ownerId;
  void cacheVariantId;
  return {
    id: _id.toString(),
    ...(shareId ? { shareId } : {}),
    ...rest,
    createdAt: (createdAt as Date).toISOString(),
  };
}
