/**
 * auth.ts (routes) — accounts and logging in, under /api/auth:
 *
 *   POST /signup   create an account → { user, accessToken } + refresh cookie
 *   POST /login    email + password  → { user, accessToken } + refresh cookie
 *   POST /refresh  refresh cookie    → { accessToken } + a new refresh cookie
 *   POST /logout   end this login (all its tabs) → 204
 *   GET  /me       who am I          → { user }
 *   POST /google   not available yet → 400
 *
 * Messages match the website's mock word for word, so the UI behaves the same.
 */
import bcrypt from 'bcryptjs';
import { Router, type Response } from 'express';
import { z } from 'zod';
import { User, type UserDoc } from '../db/models/index.js';
import { publicUser } from '../db/toPublic.js';
import { badRequest, conflict, forbidden, unauthorized } from '../lib/errors.js';
import { BLOCKED_MESSAGE, currentUser, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { createSession, REFRESH_TTL_MS, revokeSession, rotateSession } from '../services/sessions.js';
import { signAccess } from '../services/tokens.js';

/** The cookie that keeps a traveller logged in. */
export const REFRESH_COOKIE = 'tw_refresh';

/** How hard bcrypt works per password (lighter in tests so they stay fast). */
const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 4 : 12;

/** What signup needs (the same rule as the website's form). */
const SIGNUP_MESSAGE = 'Please give a name, an email and a password of at least 8 characters.';
const signupSchema = z.object({
  name: z.string({ error: SIGNUP_MESSAGE }).trim().min(1, SIGNUP_MESSAGE).max(80, 'Please use a shorter name.'),
  email: z.email({ error: SIGNUP_MESSAGE }).trim().toLowerCase().max(254),
  password: z.string({ error: SIGNUP_MESSAGE }).min(8, SIGNUP_MESSAGE).max(200, 'Please use a shorter password.'),
});

/** What login needs (anything missing is simply a wrong login). */
const loginSchema = z.object({ email: z.string().trim().toLowerCase(), password: z.string() });

/** A real-looking hash to compare against when the email is unknown, so timing doesn't reveal which emails exist. */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

/** Set the refresh cookie (httpOnly, only sent to /api/auth, 30 days). */
function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    maxAge: REFRESH_TTL_MS,
  });
}

/** Remove the refresh cookie. */
function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

/** The auth routes. `now` is the app's clock. */
export function authRoutes(now: () => Date): Router {
  const router = Router();
  const limiter = authLimiter();

  /** Finish a successful signup/login: start a session, set the cookie, return user + token. */
  async function startSession(res: Response, user: UserDoc) {
    const token = await createSession(user._id.toString(), now());
    setRefreshCookie(res, token);
    res.json({ user: publicUser(user), accessToken: signAccess({ id: user._id.toString(), role: user.role as 'user' | 'admin' }, now()) });
  }

  // POST /signup — create an account.
  router.post('/auth/signup', limiter, async (req, res) => {
    const parsed = signupSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? SIGNUP_MESSAGE);
    const { name, email, password } = parsed.data;
    if (await User.exists({ email })) throw conflict('An account with this email already exists. Try logging in.');
    try {
      const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, BCRYPT_COST) });
      await startSession(res, user);
    } catch (error) {
      // Two signups with the same email at the same moment: the unique index catches the second.
      if ((error as { code?: number }).code === 11000) throw conflict('An account with this email already exists. Try logging in.');
      throw error;
    }
  });

  // POST /login — email + password.
  router.post('/auth/login', limiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw unauthorized('Wrong email or password.');
    const user = await User.findOne({ email: parsed.data.email });
    const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Wrong email or password.');
    if (user.blocked) throw forbidden(BLOCKED_MESSAGE);
    await startSession(res, user);
  });

  // POST /refresh — swap the refresh cookie for a new access token (and a new cookie).
  router.post('/auth/refresh', async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw unauthorized('Session expired. Please log in again.');
    const rotated = await rotateSession(token, now());
    const user = await User.findById(rotated.userId);
    if (!user) throw unauthorized('Session expired. Please log in again.');
    if (user.blocked) {
      await revokeSession(rotated.token, now());
      clearRefreshCookie(res);
      throw forbidden(BLOCKED_MESSAGE);
    }
    setRefreshCookie(res, rotated.token);
    res.json({ accessToken: signAccess({ id: rotated.userId, role: user.role as 'user' | 'admin' }, now()) });
  });

  // POST /logout — cancel this login and remove the cookie.
  router.post('/auth/logout', async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) await revokeSession(token, now());
    clearRefreshCookie(res);
    res.status(204).end();
  });

  // GET /me — the signed-in user.
  router.get('/auth/me', requireAuth(now), async (req, res) => {
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    res.json({ user: publicUser(user) });
  });

  // POST /google — needs a Google OAuth client id; a later, opt-in step.
  router.post('/auth/google', (_req, _res) => {
    throw badRequest("Google sign-in isn't available yet.");
  });

  return router;
}
