/**
 * admin.ts (routes) — the admin area (admins only; everyone else 403):
 *
 *   GET /api/admin/overview   → { overview }  travellers, trips planned this week (AI / cache / own
 *                               planner), today's AI use, Tolis, sign-ups per day (30 days) and the
 *                               most planned destinations (30 days)
 *   GET   /api/admin/users?q=&page=  → { users, total }  search by name, email or @username (20 a page)
 *   PATCH /api/admin/users/:id      { blocked?, plan? } → { user }  blocking ends their sessions at once;
 *                                   admins (and yourself) can't be changed here (409)
 *   GET   /api/admin/actions        → { actions }  the audit log (last 100)
 *
 * Privacy first: admins see counts and account basics only — never anyone's trips, journals,
 * Toli chats, money, budgets, locations, Kushal links or Ask TripWise questions.
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { AdminAction, Itinerary, Toli, Usage, User, type UserDoc } from '../db/models/index.js';
import { clash, notFound } from '../lib/errors.js';
import { requireAdmin } from '../middleware/admin.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { istDay } from '../services/quota.js';
import { revokeAllSessions } from '../services/sessions.js';

/** Travellers per page. */
const PAGE = 20;
/** Audit log entries shown. */
const LOG = 100;
/** What an admin may change about a traveller. */
const userPatch = z.object({ blocked: z.boolean().optional(), plan: z.enum(['free', 'premium']).optional() }).refine((p) => p.blocked !== undefined || p.plan !== undefined, 'Nothing to change.');

/** Text typed into a search box, made safe to use inside a pattern. */
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A traveller as admins see them: account basics and how many trips — nothing private. */
export async function adminUsers(users: UserDoc[]) {
  const counts = await Itinerary.aggregate<{ _id: unknown; n: number }>([{ $match: { ownerId: { $in: users.map((u) => u._id) } } }, { $group: { _id: '$ownerId', n: { $sum: 1 } } }]);
  const trips = new Map(counts.map((c) => [String(c._id), c.n]));
  return users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    username: u.username ?? '',
    email: u.email,
    role: u.role as 'user' | 'admin',
    plan: u.plan as 'free' | 'premium',
    blocked: !!u.blocked,
    joined: (u.get('createdAt') as Date | undefined)?.toISOString() ?? '',
    trips: trips.get(u._id.toString()) ?? 0,
  }));
}

/** Write one line to the audit log. */
export async function logAdmin(adminId: string, action: string, targetType: 'user' | 'destination' | 'report', targetId: string, target: string, detail: string, at: Date) {
  await AdminAction.create({ adminId, action, targetType, targetId, target, detail, at });
}

/** A day in ms. */
const DAY_MS = 86_400_000;
/** India is 5 h 30 min ahead of UTC (sign-ups are counted per India-time day). */
const IST_OFFSET_MS = 330 * 60 * 1000;

/** The India-time date of a moment. */
const istDate = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** The admin routes. */
export function adminRoutes(now: () => Date): Router {
  const router = Router();
  const guard = [requireAuth(now), requireAdmin];

  // GET /admin/overview — how TripWise is being used.
  router.get('/admin/overview', ...guard, async (_req, res) => {
    const at = now();
    const weekAgo = new Date(at.getTime() - 7 * DAY_MS);
    const monthAgo = new Date(at.getTime() - 30 * DAY_MS);
    const [total, newThisWeek, bySource, usage, tolis, signups, top] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      Itinerary.aggregate<{ _id: string; n: number }>([{ $match: { createdAt: { $gte: weekAgo } } }, { $group: { _id: '$source', n: { $sum: 1 } } }]),
      Usage.aggregate<{ plans: number; regens: number; asks: number }>([{ $match: { day: istDay(at) } }, { $group: { _id: null, plans: { $sum: '$plans' }, regens: { $sum: '$regens' }, asks: { $sum: '$asks' } } }]),
      Toli.countDocuments(),
      User.find({ createdAt: { $gte: monthAgo } }, { _id: 0, createdAt: 1 }).lean(),
      Itinerary.aggregate<{ _id: string; trips: number }>([
        { $match: { createdAt: { $gte: monthAgo } } },
        { $group: { _id: '$request.destination', trips: { $sum: 1 } } },
        { $sort: { trips: -1, _id: 1 } },
        { $limit: 10 },
      ]),
    ]);

    // Sign-ups per India-time day for the last 30 days (oldest first, zeros included).
    const perDay = new Map<string, number>();
    for (const u of signups) perDay.set(istDate(u.createdAt as Date), (perDay.get(istDate(u.createdAt as Date)) ?? 0) + 1);
    const signups30d = Array.from({ length: 30 }, (_, i) => {
      const date = istDate(new Date(at.getTime() - (29 - i) * DAY_MS));
      return { date, count: perDay.get(date) ?? 0 };
    });
    const sources = Object.fromEntries(bySource.map((s) => [s._id ?? 'ai', s.n]));

    res.json({
      overview: {
        travellers: { total, newThisWeek },
        trips7d: { ai: sources.ai ?? 0, cache: sources.cache ?? 0, local: sources.local ?? 0 },
        today: { plans: usage[0]?.plans ?? 0, regens: usage[0]?.regens ?? 0, asks: usage[0]?.asks ?? 0 },
        tolis,
        signups30d,
        topDestinations: top.map((t) => ({ name: t._id, trips: t.trips })),
      },
    });
  });

  // GET /admin/users — find travellers.
  router.get('/admin/users', ...guard, async (req, res) => {
    const q = String(req.query.q ?? '').trim().slice(0, 80);
    const page = Math.max(1, Number(req.query.page) || 1);
    const pattern = new RegExp(escapeRegex(q.replace(/^@/, '')), 'i');
    const filter = q ? { $or: [{ name: pattern }, { email: pattern }, { username: pattern }] } : {};
    const [users, total] = await Promise.all([User.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * PAGE).limit(PAGE), User.countDocuments(filter)]);
    res.json({ users: await adminUsers(users), total });
  });

  // PATCH /admin/users/:id — block / unblock, or change the plan.
  router.patch('/admin/users/:id', ...guard, async (req, res) => {
    const me = currentUser(req).id;
    const id = String(req.params.id);
    const change = userPatch.parse(req.body);
    const user = isValidObjectId(id) ? await User.findById(id) : null;
    if (!user) throw notFound('That traveller isn’t here.');
    if (user.role === 'admin') throw clash('Admins can’t be blocked or changed here.');
    const at = now();
    if (change.blocked !== undefined && change.blocked !== !!user.blocked) {
      user.blocked = change.blocked;
      // A blocked account's logins end at once.
      if (change.blocked) await revokeAllSessions(id, at);
      await logAdmin(me, change.blocked ? 'block' : 'unblock', 'user', id, user.name, change.blocked ? 'blocked' : 'unblocked', at);
    }
    if (change.plan !== undefined && change.plan !== user.plan) {
      user.plan = change.plan;
      await logAdmin(me, 'plan', 'user', id, user.name, change.plan, new Date(at.getTime() + 1));
    }
    await user.save();
    res.json({ user: (await adminUsers([user]))[0] });
  });

  // GET /admin/actions — the audit log, newest first.
  router.get('/admin/actions', ...guard, async (_req, res) => {
    const actions = await AdminAction.find().sort({ at: -1, _id: -1 }).limit(LOG).lean();
    const admins = await User.find({ _id: { $in: [...new Set(actions.map((a) => a.adminId))] } }, { name: 1 }).lean();
    const nameOf = new Map(admins.map((a) => [a._id.toString(), a.name]));
    res.json({
      actions: actions.map((a) => ({ id: a._id.toString(), admin: { id: a.adminId, name: nameOf.get(a.adminId) ?? 'Former admin' }, action: a.action, targetType: a.targetType, target: a.target, detail: a.detail, at: a.at.toISOString() })),
    });
  });

  return router;
}
