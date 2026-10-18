/**
 * friends.ts (routes) — friends, requests, blocks and invite links (login required):
 *
 *   GET    /api/friends                         → { friends, incoming, sent }
 *   POST   /api/friends/requests   { username } → { relation }   send (or accept if they asked me)
 *   POST   /api/friends/requests/:id/accept     → { friend }     (the recipient)
 *   POST   /api/friends/requests/:id/decline    → 204            (the recipient)
 *   DELETE /api/friends/requests/:id            → 204            (the sender cancels)
 *   DELETE /api/friends/:userId                 → 204            remove a friend
 *   POST   /api/blocks             { userId }   → 204            block (ends any friendship)
 *   DELETE /api/blocks/:userId                  → 204            unblock
 *   GET    /api/users/:username/card            → { card, relation }
 *   GET    /api/invites/:code                   → { card }
 *   POST   /api/invites/:code/accept            → { friend }     become friends straight away
 *   POST   /api/me/invite-code                  → { inviteCode } a new link (the old one stops)
 *
 * People are found only by exact @username or an invite link — never by browsing. Blocked
 * people, "Only me" passports (to strangers) and unknown names all look the same: 404.
 */
import { Router, type Request } from 'express';
import { isValidObjectId } from 'mongoose';
import { Block, Friendship, User, type UserDoc } from '../db/models/index.js';
import { badRequest, conflict, notFound, quotaExceeded, unauthorized } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { nextIstMidnight } from '../services/quota.js';
import { cardOf, isBlocked, pairKey, relation } from '../services/social.js';
import { newInviteCode, normalizeUsername } from '../services/username.js';

/** Waiting requests one person may have out at once. */
const MAX_PENDING_SENT = 20;
/** Requests one person may send per India-day. */
const MAX_REQUESTS_PER_DAY = 30;
/** The answer for anyone who can't be found (or mustn't be). */
const NO_SUCH_TRAVELLER = 'No traveller with that username';

/** The friends routes. */
export function friendsRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  /** The signed-in user's full record. */
  async function me(req: Request): Promise<UserDoc> {
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    return user;
  }

  /**
   * The person behind a username, if the viewer may find them: not themselves, not blocked
   * either way, and not hiding behind "Only me" (unless already friends or a request exists).
   */
  async function findable(viewerId: string, username: string): Promise<UserDoc> {
    const other = await User.findOne({ username: normalizeUsername(username) });
    if (!other || other._id.toString() === viewerId) throw notFound(NO_SUCH_TRAVELLER);
    const rel = await relation(viewerId, other._id.toString());
    if (rel === 'blocked') throw notFound(NO_SUCH_TRAVELLER);
    if (other.privacy?.passport === 'private' && rel === 'none') throw notFound(NO_SUCH_TRAVELLER);
    return other;
  }

  /** Make (or upgrade to) an accepted friendship between two people. */
  async function makeFriends(a: string, b: string) {
    await Friendship.findOneAndUpdate(
      { pair: pairKey(a, b) },
      { $set: { status: 'accepted', acceptedAt: now() }, $setOnInsert: { requester: a, recipient: b, createdAt: now() } },
      { upsert: true },
    );
  }

  // GET /friends — my friends and the requests in both directions.
  router.get('/friends', auth, async (req, res) => {
    const myId = currentUser(req).id;
    const links = await Friendship.find({ $or: [{ requester: myId }, { recipient: myId }] })
      .sort({ createdAt: -1 })
      .lean();
    const otherId = (l: (typeof links)[number]) => (l.requester.toString() === myId ? l.recipient : l.requester).toString();
    const people = await User.find({ _id: { $in: links.map(otherId) } });
    const cards = new Map(await Promise.all(people.map(async (p) => [p._id.toString(), await cardOf(p, now())] as const)));

    const friends = links.filter((l) => l.status === 'accepted').flatMap((l) => cards.get(otherId(l)) ?? []);
    const asRequest = (l: (typeof links)[number]) => {
      const user = cards.get(otherId(l));
      return user ? [{ id: l._id.toString(), user, createdAt: l.createdAt.toISOString() }] : [];
    };
    const incoming = links.filter((l) => l.status === 'pending' && l.recipient.toString() === myId).flatMap(asRequest);
    const sent = links.filter((l) => l.status === 'pending' && l.requester.toString() === myId).flatMap(asRequest);
    friends.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ friends, incoming, sent });
  });

  // POST /friends/requests — ask someone by @username.
  router.post('/friends/requests', auth, async (req, res) => {
    const myId = currentUser(req).id;
    const other = await findable(myId, String(req.body?.username ?? ''));
    const otherId = other._id.toString();
    const existing = await Friendship.findOne({ pair: pairKey(myId, otherId) });
    if (existing?.status === 'accepted') throw conflict("You're already friends");
    // They already asked me: that's a yes.
    if (existing && existing.requester.toString() === otherId) {
      await makeFriends(myId, otherId);
      res.json({ relation: 'friend' });
      return;
    }
    if (existing) {
      res.json({ relation: 'pending-out' });
      return;
    }

    // Anti-spam limits.
    const pending = await Friendship.countDocuments({ requester: myId, status: 'pending' });
    const dayStart = new Date(nextIstMidnight(now()).getTime() - 24 * 60 * 60 * 1000);
    const today = await Friendship.countDocuments({ requester: myId, createdAt: { $gte: dayStart } });
    if (pending >= MAX_PENDING_SENT || today >= MAX_REQUESTS_PER_DAY) throw quotaExceeded("You've sent a lot of requests — try again tomorrow");

    try {
      await Friendship.create({ pair: pairKey(myId, otherId), requester: myId, recipient: otherId, status: 'pending', createdAt: now() });
    } catch (error) {
      // Both sent at the same moment: the other request wins, which is fine.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    res.json({ relation: 'pending-out' });
  });

  /** A pending request by id that `role` of the signed-in user may act on, or 404. */
  async function pendingRequest(req: Request, role: 'recipient' | 'requester') {
    const id = String(req.params.id);
    if (!isValidObjectId(id)) throw notFound("We couldn't find that request.");
    const link = await Friendship.findOne({ _id: id, status: 'pending', [role]: currentUser(req).id });
    if (!link) throw notFound("We couldn't find that request.");
    return link;
  }

  // POST /friends/requests/:id/accept — yes!
  router.post('/friends/requests/:id/accept', auth, async (req, res) => {
    const link = await pendingRequest(req, 'recipient');
    link.status = 'accepted';
    link.acceptedAt = now();
    await link.save();
    const friend = await User.findById(link.requester);
    if (!friend) throw notFound("We couldn't find that request.");
    res.json({ friend: await cardOf(friend, now()) });
  });

  // POST /friends/requests/:id/decline — no thanks (they aren't told).
  router.post('/friends/requests/:id/decline', auth, async (req, res) => {
    await (await pendingRequest(req, 'recipient')).deleteOne();
    res.status(204).end();
  });

  // DELETE /friends/requests/:id — take back a request I sent.
  router.delete('/friends/requests/:id', auth, async (req, res) => {
    await (await pendingRequest(req, 'requester')).deleteOne();
    res.status(204).end();
  });

  // DELETE /friends/:userId — stop being friends.
  router.delete('/friends/:userId', auth, async (req, res) => {
    const other = String(req.params.userId);
    if (!isValidObjectId(other)) throw notFound("We couldn't find that friend.");
    await Friendship.deleteOne({ pair: pairKey(currentUser(req).id, other) });
    res.status(204).end();
  });

  // POST /blocks — block someone: any friendship or request between us ends.
  router.post('/blocks', auth, async (req, res) => {
    const myId = currentUser(req).id;
    const other = String(req.body?.userId ?? '');
    if (!isValidObjectId(other) || other === myId || !(await User.exists({ _id: other }))) throw notFound(NO_SUCH_TRAVELLER);
    await Block.updateOne({ blocker: myId, blocked: other }, { $setOnInsert: { createdAt: now() } }, { upsert: true });
    await Friendship.deleteOne({ pair: pairKey(myId, other) });
    res.status(204).end();
  });

  // DELETE /blocks/:userId — unblock.
  router.delete('/blocks/:userId', auth, async (req, res) => {
    const other = String(req.params.userId);
    if (isValidObjectId(other)) await Block.deleteOne({ blocker: currentUser(req).id, blocked: other });
    res.status(204).end();
  });

  // GET /users/:username/card — a small card for "add by @username".
  router.get('/users/:username/card', auth, async (req, res) => {
    const myId = currentUser(req).id;
    const other = await findable(myId, String(req.params.username));
    res.json({ card: await cardOf(other, now()), relation: await relation(myId, other._id.toString()) });
  });

  /** The person behind an invite code (blocked either way counts as unknown). */
  async function inviter(req: Request): Promise<UserDoc> {
    const code = String(req.params.code);
    const owner = /^[A-Za-z0-9]{10}$/.test(code) ? await User.findOne({ inviteCode: code }) : null;
    if (!owner || (await isBlocked(currentUser(req).id, owner._id.toString()))) throw notFound('This invite link has expired');
    return owner;
  }

  // GET /invites/:code — who invited me?
  router.get('/invites/:code', auth, async (req, res) => {
    res.json({ card: await cardOf(await inviter(req), now()) });
  });

  // POST /invites/:code/accept — become friends straight away (the link was the invitation).
  router.post('/invites/:code/accept', auth, async (req, res) => {
    const owner = await inviter(req);
    const myId = currentUser(req).id;
    if (owner._id.toString() === myId) throw badRequest("That's your own invite link");
    await makeFriends(owner._id.toString(), myId);
    res.json({ friend: await cardOf(owner, now()) });
  });

  // POST /me/invite-code — a new link; the old one stops working.
  router.post('/me/invite-code', auth, async (req, res) => {
    const user = await me(req);
    user.inviteCode = newInviteCode();
    await user.save();
    res.json({ inviteCode: user.inviteCode });
  });

  return router;
}
