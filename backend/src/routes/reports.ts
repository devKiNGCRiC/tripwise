/**
 * reports.ts (routes) — reporting a public passport (login required):
 *
 *   POST /api/reports   { username, reason, note? } → 201 { report: { id } }
 *
 * Reasons: spam, offensive, impersonation, other (note up to 300 characters). Not yourself (400),
 * one open report per passport (409), at most 5 reports in 24 hours (429). Admins decide in
 * /admin/reports. The reported person is never told who reported them.
 */
import { Router } from 'express';
import { z } from 'zod';
import { Report, REPORT_REASONS, User } from '../db/models/index.js';
import { AppError, badRequest, clash, notFound } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { normalizeUsername } from '../services/username.js';

/** Reports one person may make in 24 hours. */
const PER_DAY = 5;
/** A report. */
const reportSchema = z.object({ username: z.string().min(1), reason: z.enum(REPORT_REASONS, { error: 'Pick a reason.' }), note: z.string().trim().max(300, 'Keep the note under 300 characters.').optional() });

/** The report routes. */
export function reportRoutes(now: () => Date): Router {
  const router = Router();

  // POST /reports — report someone's public passport.
  router.post('/reports', requireAuth(now), async (req, res) => {
    const me = currentUser(req).id;
    const input = reportSchema.parse(req.body);
    const target = await User.findOne({ username: normalizeUsername(input.username) }, { _id: 1 }).lean();
    if (!target) throw notFound('We couldn’t find that traveller.');
    const targetId = target._id.toString();
    if (targetId === me) throw badRequest('You can’t report yourself.');
    if (await Report.exists({ reporterId: me, targetId, status: 'open' })) throw clash('You’ve already reported this passport — an admin will look at it.');
    const at = now();
    if ((await Report.countDocuments({ reporterId: me, createdAt: { $gt: new Date(at.getTime() - 86_400_000) } })) >= PER_DAY) throw new AppError(429, 'QUOTA_EXCEEDED', 'You’ve sent 5 reports today — thank you. Try again tomorrow.');
    const report = await Report.create({ reporterId: me, targetId, reason: input.reason, ...(input.note ? { note: input.note } : {}), createdAt: at });
    res.status(201).json({ report: { id: report._id.toString() } });
  });

  return router;
}
