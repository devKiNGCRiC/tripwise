/**
 * rateLimit.ts — limits on how often someone can call the API, against floods and
 * password guessing. Each limiter is created per app (so tests start fresh).
 *
 *   global:   300 requests / 15 min per IP
 *   auth:      10 attempts / 15 min per IP (login, signup)
 *   generate:  10 AI requests / 1 min per user
 */
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

/** The body every "slow down" answer uses. */
const tooMany = (message: string) => ({ error: { code: 'VALIDATION', message } });

/** Overall limit per IP. */
export function globalLimiter() {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: tooMany('Too many requests. Please wait a few minutes and try again.'),
  });
}

/** Login / signup attempts per IP. */
export function authLimiter() {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: tooMany('Too many attempts. Please wait 15 minutes and try again.'),
  });
}

/** AI generation requests per signed-in user (falls back to IP). */
export function generateLimiter() {
  return rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req as Request & { user?: { id: string } }).user?.id ?? ipKeyGenerator(req.ip ?? ''),
    message: tooMany("You're planning very fast! Please wait a minute and try again."),
  });
}
