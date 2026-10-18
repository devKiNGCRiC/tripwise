/**
 * accountDeletion.ts — "delete my account and all my data", completely.
 * Everything that belongs to the traveller goes: trips, daily usage, logins, reset links,
 * profile photo and journal photos. (Journals and friendships join this list as those
 * features arrive.)
 */
import { Avatar, Itinerary, PasswordReset, Session, Usage, User } from '../db/models/index.js';
import { deletePhotosOf } from './photos.js';

/** Remove a traveller and everything that is theirs. */
export async function deleteAccountData(userId: string): Promise<void> {
  // Photos first: they may live outside MongoDB.
  await deletePhotosOf(userId);
  await Promise.all([
    Itinerary.deleteMany({ ownerId: userId }),
    Usage.deleteMany({ userId }),
    Session.deleteMany({ userId }),
    PasswordReset.deleteMany({ userId }),
    Avatar.deleteMany({ userId }),
  ]);
  await User.deleteOne({ _id: userId });
}
