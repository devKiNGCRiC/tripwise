/**
 * accountDeletion.ts — "delete my account and all my data", completely.
 * Everything that belongs to the traveller goes: trips, journals and their photos, daily
 * usage, logins, reset links and the profile photo. (Friendships join this list with the
 * friends feature.)
 */
import { Avatar, Itinerary, Journal, PasswordReset, Session, Usage, User } from '../db/models/index.js';
import type { PhotoStore } from './photos.js';

/** Remove a traveller and everything that is theirs. */
export async function deleteAccountData(userId: string, photos: PhotoStore): Promise<void> {
  // Photos first: they may live outside MongoDB.
  await photos.removeAllOf(userId);
  await Promise.all([
    Itinerary.deleteMany({ ownerId: userId }),
    Journal.deleteMany({ ownerId: userId }),
    Usage.deleteMany({ userId }),
    Session.deleteMany({ userId }),
    PasswordReset.deleteMany({ userId }),
    Avatar.deleteMany({ userId }),
  ]);
  await User.deleteOne({ _id: userId });
}
