/**
 * account.ts (routes) — keeping an account safe:
 *
 *   POST   /api/me/password      { currentPassword, newPassword } → 204 (other devices signed out)
 *   POST   /api/auth/logout-all  sign out on every device          → 204
 *   DELETE /api/me               { password }                      → 204 (account and all data gone)
 *   POST   /api/auth/forgot      { email }                         → 200 { ok: true }, always
 *   POST   /api/auth/reset       { token, password }               → 200 { ok: true }
 *
 * Forgot-password never reveals whether an email has an account, sends at most 3 emails an
 * hour per address, and its links work once, for 30 minutes.
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { PasswordReset, User } from '../db/models/index.js';
import { badRequest, unauthorized } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { deleteAccountData } from '../services/accountDeletion.js';
import type { Mailer } from '../services/mailer.js';
import { createSession, revokeAllSessions } from '../services/sessions.js';
import { hashToken } from '../services/tokens.js';
import { BCRYPT_COST, clearRefreshCookie, setRefreshCookie } from './auth.js';

/** How long a reset link works. */
const RESET_TTL_MS = 30 * 60 * 1000;
/** Reset emails allowed per address per hour. */
const RESETS_PER_HOUR = 3;
/** The message for any unusable reset link. */
const EXPIRED_LINK = 'This reset link has expired. Ask for a new one.';
/** New passwords follow the signup rule. */
const newPassword = z.string({ error: 'Passwords need at least 8 characters' }).min(8, 'Passwords need at least 8 characters').max(200, 'Please use a shorter password');

/** The account routes. */
export function accountRoutes(deps: { now: () => Date; mailer: Mailer; appUrl: string }): Router {
  const router = Router();
  const { now } = deps;
  const auth = requireAuth(now);

  // Forgot-password per IP: over the limit it quietly does nothing (still "ok").
  const forgotLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: false,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.json({ ok: true });
    },
  });

  // POST /me/password — change it (current one required); this device stays logged in.
  router.post('/me/password', auth, async (req, res) => {
    const body = z.object({ currentPassword: z.string().default(''), newPassword }).safeParse(req.body ?? {});
    if (!body.success) throw badRequest(body.error.issues[0]?.message ?? 'Please check the passwords.');
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    if (!(await bcrypt.compare(body.data.currentPassword, user.passwordHash))) throw badRequest("Your current password isn't right");

    user.passwordHash = await bcrypt.hash(body.data.newPassword, BCRYPT_COST);
    await user.save();
    // Every login ends; this browser gets a fresh one so it stays signed in.
    await revokeAllSessions(user._id.toString(), now());
    setRefreshCookie(res, await createSession(user._id.toString(), now()));
    res.status(204).end();
  });

  // POST /auth/logout-all — end every login, everywhere.
  router.post('/auth/logout-all', auth, async (req, res) => {
    await revokeAllSessions(currentUser(req).id, now());
    clearRefreshCookie(res);
    res.status(204).end();
  });

  // DELETE /me — delete the account and everything in it (password required).
  router.delete('/me', auth, async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    if (!(await bcrypt.compare(password, user.passwordHash))) throw badRequest("That password isn't right");
    await deleteAccountData(user._id.toString());
    clearRefreshCookie(res);
    res.status(204).end();
  });

  // POST /auth/forgot — email a reset link (the answer is the same whether or not the email exists).
  router.post('/auth/forgot', forgotLimiter, async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = email ? await User.findOne({ email }) : null;
    if (user && !user.blocked) {
      const hourAgo = new Date(now().getTime() - 60 * 60 * 1000);
      const recent = await PasswordReset.countDocuments({ userId: user._id, createdAt: { $gt: hourAgo } });
      if (recent < RESETS_PER_HOUR) {
        const token = randomBytes(32).toString('base64url');
        await PasswordReset.create({ userId: user._id, tokenHash: hashToken(token), createdAt: now(), expiresAt: new Date(now().getTime() + RESET_TTL_MS) });
        const link = `${deps.appUrl.replace(/\/$/, '')}/reset-password/${token}`;
        try {
          await deps.mailer({
            to: user.email,
            subject: 'Reset your TripWise password',
            text: `Hi ${user.name},\n\nUse this link to choose a new TripWise password (it works for 30 minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
            html: `<p>Hi ${escapeHtml(user.name)},</p><p>Use this link to choose a new TripWise password (it works for 30 minutes):</p><p><a href="${link}">Reset my password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
          });
        } catch (error) {
          // The traveller still sees "check your email"; we log the failure for ourselves.
          console.error('[mail] could not send a reset email:', error);
        }
      }
    }
    res.json({ ok: true });
  });

  // POST /auth/reset — set a new password from an emailed link.
  router.post('/auth/reset', async (req, res) => {
    const body = z.object({ token: z.string().min(1, EXPIRED_LINK), password: newPassword }).safeParse(req.body ?? {});
    if (!body.success) throw badRequest(body.error.issues[0]?.message ?? EXPIRED_LINK);
    // Claim the link atomically, so it can only ever be used once.
    const reset = await PasswordReset.findOneAndUpdate(
      { tokenHash: hashToken(body.data.token), usedAt: { $exists: false }, expiresAt: { $gt: now() } },
      { usedAt: now() },
    );
    if (!reset) throw badRequest(EXPIRED_LINK);
    const user = await User.findById(reset.userId);
    if (!user) throw badRequest(EXPIRED_LINK);
    user.passwordHash = await bcrypt.hash(body.data.password, BCRYPT_COST);
    await user.save();
    // Whoever might have been using the old password is signed out.
    await revokeAllSessions(user._id.toString(), now());
    res.json({ ok: true });
  });

  return router;
}

/** Make text safe to put inside HTML. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
