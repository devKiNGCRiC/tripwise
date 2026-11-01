/**
 * tolis.ts (routes) — Tolis: groups of Sahyatris planning a trip together (login required).
 *
 *   POST   /api/tolis                       { name, type }   → 201 { toli }   the creator is the Sutradhar
 *   GET    /api/tolis                                         → { tolis }      mine, newest first
 *   GET    /api/tolis/:id                                     → { toli }
 *   PATCH  /api/tolis/:id                   { name?, announcementMode? }      leaders
 *   POST   /api/tolis/:id/invite                              → { inviteUrl }  leaders; the old link stops
 *   GET    /api/toli-invites/:token                           → { invite }     a preview before joining
 *   POST   /api/toli-invites/:token/join                      → { toli }       join (again is fine)
 *   POST   /api/tolis/:id/members           { username }     → { toli }       leaders add a friend
 *   PATCH  /api/tolis/:id/members/:userId   { role }         → { toli }       the Sutradhar; role 'sutradhar' passes it on
 *   DELETE /api/tolis/:id/members/:userId                     → 204            leave (self) or remove (leaders)
 *   PATCH  /api/tolis/:id/me                { phone }        → { toli }       share a phone number with this Toli (null hides it)
 *
 * Anyone who isn't a member gets 404 for everything, as if the Toli didn't exist; people
 * blocked by (or blocking) a member can't join or be added. College and office Tolis start
 * in announcement mode. At most 500 Sahyatris.
 */
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { Toli, User } from '../db/models/index.js';
import { clash, forbidden, notFound } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { relation } from '../services/social.js';
import { blockedWith, inviteUrlFor, loadMember, logActivity, MAX_MEMBERS, memberCards, requireLeader, TOLI_NOT_FOUND, toliView } from '../services/tolis.js';
import { defaultsForType } from '../services/toliRules.js';
import { normalizeUsername } from '../services/username.js';

/** A fresh secret for an invite link. */
const newToken = () => randomBytes(18).toString('base64url');

/** New Toli. */
const createSchema = z.object({
  name: z.string().trim().min(2, 'Give your Toli a name (2–60 characters).').max(60, 'Give your Toli a name (2–60 characters).'),
  type: z.enum(['friends', 'family', 'college', 'office'], { error: 'Pick the kind of trip: friends, family, college or office.' }),
});
/** Changes leaders may make. */
const patchSchema = z.object({ name: createSchema.shape.name.optional(), announcementMode: z.boolean().optional() });
/** A role change. */
const roleSchema = z.object({ role: z.enum(['sutradhar', 'sah', 'sahyatri'], { error: 'Unknown role.' }) });
/** An Indian mobile number, or null to stop sharing. */
const phoneSchema = z.object({
  phone: z
    .string()
    .transform((raw) => raw.replace(/[\s()-]/g, ''))
    .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v), 'Enter a 10-digit Indian mobile number.')
    .transform((v) => `+91${v.slice(-10)}`)
    .nullable(),
});

/** The Toli routes. */
export function tolisRoutes(deps: { now: () => Date; appUrl: string }): Router {
  const router = Router();
  const auth = requireAuth(deps.now);

  // POST /tolis — start a Toli; the creator is its Sutradhar.
  router.post('/tolis', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { name, type } = createSchema.parse(req.body);
    const now = deps.now();
    const toli = await Toli.create({ name, type, ...defaultsForType(type), inviteToken: newToken(), members: [{ userId: me, role: 'sutradhar', joinedAt: now }] });
    await logActivity(toli._id.toString(), me, 'created', { name }, now);
    res.status(201).json({ toli: await toliView(toli, toli.members[0], now, deps.appUrl) });
  });

  // GET /tolis — the Tolis I'm in, newest first.
  router.get('/tolis', auth, async (req, res) => {
    const me = currentUser(req).id;
    const tolis = await Toli.find({ 'members.userId': me }).sort({ createdAt: -1 });
    const now = deps.now();
    res.json({ tolis: await Promise.all(tolis.map((t) => toliView(t, t.members.find((m) => m.userId.toString() === me)!, now, deps.appUrl))) });
  });

  // GET /tolis/:id — one Toli.
  router.get('/tolis/:id', auth, async (req, res) => {
    const { toli, member } = await loadMember(String(req.params.id), currentUser(req).id);
    res.json({ toli: await toliView(toli, member, deps.now(), deps.appUrl) });
  });

  // PATCH /tolis/:id — rename, or switch announcement mode (leaders).
  router.patch('/tolis/:id', auth, async (req, res) => {
    const { toli, member } = await loadMember(String(req.params.id), currentUser(req).id);
    requireLeader(member);
    const changes = patchSchema.parse(req.body);
    if (changes.name !== undefined) toli.name = changes.name;
    if (changes.announcementMode !== undefined) toli.announcementMode = changes.announcementMode;
    await toli.save();
    res.json({ toli: await toliView(toli, member, deps.now(), deps.appUrl) });
  });

  // POST /tolis/:id/invite — a new invite link (leaders); the old one stops working.
  router.post('/tolis/:id/invite', auth, async (req, res) => {
    const { toli, member } = await loadMember(String(req.params.id), currentUser(req).id);
    requireLeader(member);
    toli.inviteToken = newToken();
    await toli.save();
    res.json({ inviteUrl: inviteUrlFor(deps.appUrl, toli.inviteToken) });
  });

  /** The Toli behind an invite token, if this person may join it (404 otherwise). */
  async function invitedTo(token: string, userId: string) {
    const toli = await Toli.findOne({ inviteToken: token });
    if (!toli || (await blockedWith(toli, userId))) throw notFound(TOLI_NOT_FOUND);
    return toli;
  }

  /** Add someone as a Sahyatri (no-op if already in); 409 when the Toli is full. */
  async function addMember(toli: Awaited<ReturnType<typeof invitedTo>>, userId: string, actorId: string, via: string) {
    if (toli.members.some((m) => m.userId.toString() === userId)) return;
    if (toli.members.length >= MAX_MEMBERS) throw clash(`This Toli is full (${MAX_MEMBERS} Sahyatris).`);
    const now = deps.now();
    toli.members.push({ userId, role: 'sahyatri', joinedAt: now });
    await toli.save();
    await logActivity(toli._id.toString(), userId, 'joined', { via, ...(actorId !== userId ? { addedBy: actorId } : {}) }, now);
  }

  // GET /toli-invites/:token — what you'd be joining.
  router.get('/toli-invites/:token', auth, async (req, res) => {
    const me = currentUser(req).id;
    const toli = await invitedTo(String(req.params.token), me);
    const sutradhar = (await memberCards(toli)).find((m) => m.role === 'sutradhar');
    res.json({
      invite: {
        toliId: toli._id.toString(),
        name: toli.name,
        type: toli.type,
        memberCount: toli.members.length,
        sutradhar: sutradhar && { id: sutradhar.id, name: sutradhar.name, username: sutradhar.username, ...(sutradhar.avatarUrl ? { avatarUrl: sutradhar.avatarUrl } : {}) },
        alreadyMember: toli.members.some((m) => m.userId.toString() === me),
      },
    });
  });

  // POST /toli-invites/:token/join — join through the link.
  router.post('/toli-invites/:token/join', auth, async (req, res) => {
    const me = currentUser(req).id;
    const toli = await invitedTo(String(req.params.token), me);
    await addMember(toli, me, me, 'link');
    const member = toli.members.find((m) => m.userId.toString() === me)!;
    res.json({ toli: await toliView(toli, member, deps.now(), deps.appUrl) });
  });

  // POST /tolis/:id/members — leaders add a friend by @username.
  router.post('/tolis/:id/members', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    requireLeader(member);
    const { username } = z.object({ username: z.string().trim().min(1) }).parse(req.body);
    const other = await User.findOne({ username: normalizeUsername(username) });
    if (!other || (await blockedWith(toli, other._id.toString()))) throw notFound('No traveller with that username');
    if ((await relation(me, other._id.toString())) !== 'friend') throw forbidden('You can add friends only — share the invite link with anyone else.');
    await addMember(toli, other._id.toString(), me, 'username');
    res.json({ toli: await toliView(toli, member, deps.now(), deps.appUrl) });
  });

  // PATCH /tolis/:id/members/:userId — the Sutradhar changes a role (or passes the Sutradhar role on).
  router.patch('/tolis/:id/members/:userId', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    if (member.role !== 'sutradhar') throw forbidden('Only the Sutradhar can change roles.');
    const { role } = roleSchema.parse(req.body);
    const target = toli.members.find((m) => m.userId.toString() === String(req.params.userId));
    if (!target) throw notFound('That person isn’t in this Toli.');
    if (target === member) throw clash('Pass the Sutradhar role to someone else instead.');
    if (role === 'sutradhar') member.role = 'sah';
    target.role = role;
    await toli.save();
    await logActivity(toli._id.toString(), me, 'role', { userId: target.userId.toString(), role }, deps.now());
    res.json({ toli: await toliView(toli, member, deps.now(), deps.appUrl) });
  });

  // DELETE /tolis/:id/members/:userId — leave the Toli, or (leaders) remove someone.
  router.delete('/tolis/:id/members/:userId', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const targetId = String(req.params.userId);
    const target = toli.members.find((m) => m.userId.toString() === targetId);
    if (!target) throw notFound('That person isn’t in this Toli.');
    if (targetId === me) {
      if (member.role === 'sutradhar') throw clash('Pass the Sutradhar role to someone first.');
    } else {
      requireLeader(member);
      // The Sutradhar can't be removed; only the Sutradhar removes co-leaders.
      if (target.role === 'sutradhar' || (target.role === 'sah' && member.role !== 'sutradhar')) throw forbidden('You can’t remove that person.');
    }
    toli.members.pull({ userId: target.userId });
    await toli.save();
    await logActivity(toli._id.toString(), me, targetId === me ? 'left' : 'removed', targetId === me ? {} : { userId: targetId }, deps.now());
    res.status(204).end();
  });

  // PATCH /tolis/:id/me — share (or stop sharing) a phone number with this Toli.
  router.patch('/tolis/:id/me', auth, async (req, res) => {
    const { toli, member } = await loadMember(String(req.params.id), currentUser(req).id);
    const { phone } = phoneSchema.parse(req.body);
    member.phone = phone ?? undefined;
    await toli.save();
    res.json({ toli: await toliView(toli, member, deps.now(), deps.appUrl) });
  });

  return router;
}
