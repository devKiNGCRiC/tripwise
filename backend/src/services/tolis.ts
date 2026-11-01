/**
 * tolis.ts (service) — what every Toli route needs:
 *   loadMember     the Toli and the caller's membership — 404 for anyone who isn't a member
 *                  (so outsiders can't even tell a Toli exists)
 *   requireLeader  403 unless the member is the Sutradhar or a Sah-Sutradhar
 *   blockedWith    has this person blocked, or been blocked by, any member?
 *   logActivity    add an event to the Toli's activity feed
 *   toliView       the Toli as a member sees it (members with roles; the invite link for leaders;
 *                  planDefaults: the members' favourite interests, for planning the Sahyatra)
 */
import { isValidObjectId } from 'mongoose';
import { Block, Toli, ToliActivity, User, type ToliDoc } from '../db/models/index.js';
import { avatarUrl } from '../db/toPublic.js';
import { forbidden, notFound } from '../lib/errors.js';
import { canPost, isLeader, type ToliRole, type TripType } from './toliRules.js';

/** The same answer for a missing Toli and one you're not in. */
export const TOLI_NOT_FOUND = "This Toli isn't available.";
/** Most Sahyatris in one Toli (a guard against misuse, not a product limit). */
export const MAX_MEMBERS = 500;

/** A member record inside a Toli. */
export type Member = ToliDoc['members'][number];

/** A member as the Toli shows them. */
export interface MemberCard {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role: ToliRole;
  /** Only when they chose to share it with this Toli. */
  phone?: string;
}

/** The Toli as a member sees it. */
export interface ToliView {
  id: string;
  name: string;
  type: TripType;
  announcementMode: boolean;
  tripId: string | null;
  choices: { destination?: string; startDate?: string; endDate?: string; transport?: string };
  me: { role: ToliRole; canPost: boolean; requestsOff: boolean; phone?: string };
  members: MemberCard[];
  memberCount: number;
  /** For planning the Sahyatra: the interests members saved, most common first (max 5). */
  planDefaults: { interests: string[] };
  /** Leaders only. */
  inviteUrl?: string;
}

/** Interests a planning request takes at most. */
const MAX_INTERESTS = 5;

/** The members' saved interests, most common first (ties alphabetical), at most five. */
async function favouriteInterests(toli: ToliDoc): Promise<string[]> {
  const users = await User.find({ _id: { $in: toli.members.map((m) => m.userId) } }, { 'preferences.interests': 1 }).lean();
  const counts = new Map<string, number>();
  for (const user of users) for (const interest of user.preferences?.interests ?? []) counts.set(interest, (counts.get(interest) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, MAX_INTERESTS).map(([interest]) => interest);
}

/** The Toli and the caller's membership (404 for bad ids, missing Tolis and non-members). */
export async function loadMember(toliId: string, userId: string): Promise<{ toli: ToliDoc; member: Member }> {
  const toli = isValidObjectId(toliId) ? await Toli.findById(toliId) : null;
  const member = toli?.members.find((m) => m.userId.toString() === userId);
  if (!toli || !member) throw notFound(TOLI_NOT_FOUND);
  return { toli, member };
}

/** 403 unless the member leads the Toli. */
export function requireLeader(member: Member, message = 'Only the Sutradhar and Sah-Sutradhars can do that.') {
  if (!isLeader(member.role as ToliRole)) throw forbidden(message);
}

/** Has `userId` blocked, or been blocked by, anyone in the Toli? */
export async function blockedWith(toli: ToliDoc, userId: string): Promise<boolean> {
  const ids = toli.members.map((m) => m.userId);
  return !!(await Block.exists({ $or: [{ blocker: userId, blocked: { $in: ids } }, { blocker: { $in: ids }, blocked: userId }] }));
}

/** Add an event to the Toli's activity feed. */
export async function logActivity(toliId: string, actorId: string, type: string, data: Record<string, unknown>, at: Date) {
  await ToliActivity.create({ toliId, actorId, type, data, at });
}

/** The invite link for a token. */
export const inviteUrlFor = (appUrl: string, token: string) => `${appUrl}/toli/join/${token}`;

/** Light member cards (no per-member counting: Tolis can be big and screens refresh often). */
export async function memberCards(toli: ToliDoc): Promise<MemberCard[]> {
  const users = await User.find({ _id: { $in: toli.members.map((m) => m.userId) } }, { name: 1, username: 1, avatar: 1 }).lean();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  return toli.members.flatMap((m) => {
    const user = byId.get(m.userId.toString());
    if (!user) return [];
    return [
      {
        id: user._id.toString(),
        name: user.name,
        username: user.username ?? '',
        ...(user.avatar ? { avatarUrl: avatarUrl(user._id.toString(), user.avatar.version) } : {}),
        role: m.role as ToliRole,
        ...(m.phone ? { phone: m.phone } : {}),
      },
    ];
  });
}

/** The Toli as `member` sees it. */
export async function toliView(toli: ToliDoc, member: Member, now: Date, appUrl: string): Promise<ToliView> {
  const role = member.role as ToliRole;
  const choices = toli.choices ?? {};
  return {
    id: toli._id.toString(),
    name: toli.name,
    type: toli.type as TripType,
    announcementMode: toli.announcementMode,
    tripId: toli.tripId ?? null,
    choices: Object.fromEntries(Object.entries({ destination: choices.destination, startDate: choices.startDate, endDate: choices.endDate, transport: choices.transport }).filter(([, v]) => v)),
    me: {
      role,
      canPost: canPost({ role, postUntil: member.postUntil?.toISOString() ?? null, oneMessage: member.oneMessage }, toli.announcementMode, now.toISOString()),
      requestsOff: member.requestsOff,
      ...(member.phone ? { phone: member.phone } : {}),
    },
    members: await memberCards(toli),
    memberCount: toli.members.length,
    planDefaults: { interests: await favouriteInterests(toli) },
    ...(isLeader(role) ? { inviteUrl: inviteUrlFor(appUrl, toli.inviteToken) } : {}),
  };
}
