/**
 * accountDeletion.ts — "delete my account and all my data", completely.
 * Everything that belongs to the traveller goes: trips, journals and their photos, daily
 * usage, logins, reset links, the profile photo, friendships, requests and blocks — and their
 * private trip data: Kushal contacts (their family links stop working) and check-ins, any
 * location they were sharing, their budget ranges, personal expenses and own packing lists.
 *
 * Tolis (the owner's rule, the same as leaving one): an account can't be deleted while its owner
 * owes or is owed money in a Toli, or is the Sutradhar of a Toli others are in — they settle up
 * and hand over first (tolisBlockingDeletion). Then they leave every Toli; a Toli where they were
 * the only member goes with them, with everything in it.
 */
import {
  Anurodh,
  Avatar,
  Block,
  Friendship,
  Itinerary,
  Journal,
  KushalCheckIn,
  KushalContact,
  Message,
  PasswordReset,
  Poll,
  PotliItem,
  Session,
  Sujhav,
  Toli,
  ToliActivity,
  ToliBudget,
  ToliExpense,
  ToliLocation,
  ToliNote,
  ToliSettlement,
  ToliSplit,
  Usage,
  User,
} from '../db/models/index.js';
import { memberBalance } from './lekha.js';
import type { PhotoStore } from './photos.js';

/** Why the account can't be deleted yet (the first Toli in the way), or null when it can. */
export async function tolisBlockingDeletion(userId: string): Promise<string | null> {
  const tolis = await Toli.find({ 'members.userId': userId });
  for (const toli of tolis) {
    const member = toli.members.find((m) => m.userId.toString() === userId)!;
    if (member.role === 'sutradhar' && toli.members.length > 1) return `Pass the Sutradhar role in “${toli.name}” to someone first.`;
    if ((await memberBalance(toli._id.toString(), userId)) !== 0) return `Settle up first in “${toli.name}” — you still owe or are owed money there.`;
  }
  return null;
}

/** Leave every Toli; a Toli where they were the only member is removed with all its records. */
async function leaveTolis(userId: string): Promise<void> {
  const tolis = await Toli.find({ 'members.userId': userId });
  for (const toli of tolis) {
    const toliId = toli._id.toString();
    if (toli.members.length > 1) {
      toli.members.pull({ userId });
      await toli.save();
      continue;
    }
    await Promise.all(
      [Sujhav, Poll, Message, Anurodh, ToliActivity, ToliBudget, ToliExpense, ToliSettlement, ToliSplit, ToliNote, PotliItem, ToliLocation].map((model) => (model as typeof Sujhav).deleteMany({ toliId })),
    );
    await toli.deleteOne();
  }
}

/** Remove a traveller and everything that is theirs. */
export async function deleteAccountData(userId: string, photos: PhotoStore): Promise<void> {
  // Out of their Tolis first (the caller has checked nothing is owed and no Toli is left leaderless).
  await leaveTolis(userId);
  // Photos next: they may live outside MongoDB.
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
