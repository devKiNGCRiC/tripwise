/**
 * auth.ts (middleware) — "you must be logged in" for protected routes.
 * Reads `Authorization: Bearer <access token>`, checks it, loads the user (so blocked
 * accounts and plan changes apply straight away) and puts them on `req.user`.
 */
import type { NextFunction, Request, Response } from 'express';
import { User } from '../db/models/index.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { verifyAccess } from '../services/tokens.js';
import { ensureUsername } from '../services/username.js';

/** The signed-in traveller, as routes see them. */
export interface AuthUser {
  id: string;
  role: 'user' | 'admin';
  plan: 'free' | 'premium';
}

// Teach TypeScript that requests may carry the signed-in user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** The message shown to blocked accounts (same as the mock). */
export const BLOCKED_MESSAGE = 'This account has been blocked. Contact support if you think this is a mistake.';

/** Build the middleware; `now` is the app's clock (tests move it). */
export function requireAuth(now: () => Date) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // 1. A Bearer token must be present and valid.
      const header = req.get('authorization') ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      if (!token) throw unauthorized();
      const claims = verifyAccess(token, now());

      // 2. The account must still exist and not be blocked.
      const user = await User.findById(claims.sub);
      if (!user) throw unauthorized();
      if (user.blocked) throw forbidden(BLOCKED_MESSAGE);
      // Accounts made before usernames existed get one now.
      await ensureUsername(user);

      req.user = { id: user._id.toString(), role: user.role as AuthUser['role'], plan: user.plan as AuthUser['plan'] };
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** The signed-in user of a request that went through requireAuth. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
