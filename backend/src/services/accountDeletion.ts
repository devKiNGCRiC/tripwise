/**
 * accountDeletion.ts — "delete my account and all my data", completely.
 * Everything that belongs to the traveller goes: trips, journals and their photos, daily
 * usage, logins, reset links, the profile photo, friendships, requests and blocks — and their
 * private trip data: Kushal contacts (their family links stop working) and check-ins, any
 * location they were sharing, their budget ranges, personal expenses and own packing lists.
 */
import { Avatar, Block, Friendship, Itinerary, Journal, KushalCheckIn, KushalContact, PasswordReset, PotliItem, Session, ToliBudget, ToliExpense, ToliLocation, Usage, User } from '../db/models/index.js';
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
    Friendship.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] }),
    Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] }),
    KushalContact.deleteMany({ userId }),
    KushalCheckIn.deleteMany({ userId }),
    ToliLocation.deleteMany({ userId }),
    ToliBudget.deleteMany({ userId }),
    ToliExpense.deleteMany({ addedBy: userId, personal: true }),
    PotliItem.deleteMany({ addedBy: userId, mine: true }),
  ]);
  await User.deleteOne({ _id: userId });
}
