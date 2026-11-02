/**
 * admin.ts (routes) — the admin area (admins only; everyone else 403):
 *
 *   GET /api/admin/overview   → { overview }  travellers, trips planned this week (AI / cache / own
 *                               planner), today's AI use, Tolis, sign-ups per day (30 days) and the
 *                               most planned destinations (30 days)
 *
 * Privacy first: admins see counts and account basics only — never anyone's trips, journals,
 * Toli chats, money, budgets, locations, Kushal links or Ask TripWise questions.
 */
import { Router } from 'express';
import { Itinerary, Toli, Usage, User } from '../db/models/index.js';
import { requireAdmin } from '../middleware/admin.js';
import { requireAuth } from '../middleware/auth.js';
import { istDay } from '../services/quota.js';

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

  return router;
}
