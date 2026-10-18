/**
 * social.ts — how two travellers are connected, and therefore what one may see of the other.
 *
 * Every privacy decision in the API comes from here:
 *   - canSeePassport: yourself always; never if either has blocked the other; otherwise by
 *     the owner's choice — Only me, Friends, or Everyone (even people who aren't logged in);
 *   - canSeeJournalOf: the passport rule, plus the owner's "show my journal" switch.
 */
import { isValidObjectId } from 'mongoose';
import { Block, Friendship, Itinerary, User, type UserDoc } from '../db/models/index.js';
import { publicUser } from '../db/toPublic.js';
import { istDay } from './quota.js';

/** How the viewer is connected to someone. */
export type Relation = 'self' | 'friend' | 'pending-out' | 'pending-in' | 'none' | 'blocked';

/** The small card shown in friend lists and lookups. */
export interface Card {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  travellerType: string | null;
  /** Finished trips. */
  trips: number;
}

/** The single key for a pair of users, whoever asked first. */
export const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/** Has either of the two blocked the other? */
export async function isBlocked(a: string, b: string): Promise<boolean> {
  return !!(await Block.exists({ $or: [{ blocker: a, blocked: b }, { blocker: b, blocked: a }] }));
}

/** How `viewerId` is connected to `ownerId`. */
export async function relation(viewerId: string | null, ownerId: string): Promise<Relation> {
  if (!viewerId) return 'none';
  if (viewerId === ownerId) return 'self';
  if (await isBlocked(viewerId, ownerId)) return 'blocked';
  const link = await Friendship.findOne({ pair: pairKey(viewerId, ownerId) }).lean();
  if (!link) return 'none';
  if (link.status === 'accepted') return 'friend';
  return link.requester.toString() === viewerId ? 'pending-out' : 'pending-in';
}

/** May the viewer (or a logged-out visitor) see this passport? */
export async function canSeePassport(viewerId: string | null, owner: UserDoc): Promise<boolean> {
  const rel = await relation(viewerId, owner._id.toString());
  if (rel === 'self') return true;
  if (rel === 'blocked') return false;
  const choice = owner.privacy?.passport ?? 'friends';
  if (choice === 'everyone') return true;
  if (choice === 'friends') return rel === 'friend';
  return false;
}

/** May the viewer see this owner's journal ratings, memories and photos? */
export async function canSeeJournalOf(viewerId: string | null, ownerId: string): Promise<boolean> {
  if (!isValidObjectId(ownerId)) return false;
  const owner = await User.findById(ownerId);
  if (!owner) return false;
  if (viewerId === ownerId) return true;
  return (owner.privacy?.showJournal ?? true) && (await canSeePassport(viewerId, owner));
}

/** A traveller's card. `today` (India time) decides which trips are finished. */
export async function cardOf(user: UserDoc, now: Date): Promise<Card> {
  const trips = await Itinerary.countDocuments({ ownerId: user._id, 'request.endDate': { $lt: istDay(now) } });
  const shown = publicUser(user);
  return {
    id: shown.id,
    name: shown.name,
    username: shown.username,
    ...(shown.avatarUrl ? { avatarUrl: shown.avatarUrl } : {}),
    travellerType: user.travellerType ?? null,
    trips,
  };
}
