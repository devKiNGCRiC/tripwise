/**
 * tokens.ts — the two kinds of login token.
 *
 * 1. Access token: a short JWT (15 minutes) the website keeps in memory and sends as
 *    `Authorization: Bearer …`. Short-lived, so a leaked one is soon useless.
 * 2. Refresh token: a long random string in an httpOnly cookie (scripts can't read it).
 *    We store only its SHA-256 hash; it is swapped for a new one on every use
 *    (services/sessions.ts).
 *
 * Every function takes `now` so tests can move time forward.
 */
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../lib/errors.js';

/** How long an access token lasts. */
export const ACCESS_TTL_SECONDS = 15 * 60;

/** Who a valid access token belongs to. */
export interface AccessClaims {
  sub: string;
  role: 'user' | 'admin';
}

/** The signing secret (checked for length at start-up by config/env.ts). */
function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error('JWT_SECRET is not set');
  return value;
}

/** Seconds since 1970 for a given time (what JWTs use). */
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Make a 15-minute access token for a user. */
export function signAccess(user: { id: string; role: 'user' | 'admin' }, now: Date = new Date()): string {
  const iat = seconds(now);
  return jwt.sign({ sub: user.id, role: user.role, iat, exp: iat + ACCESS_TTL_SECONDS }, secret(), { algorithm: 'HS256' });
}

/** Check an access token; throws 401 if it is fake, tampered with or expired. */
export function verifyAccess(token: string, now: Date = new Date()): AccessClaims {
  try {
    const claims = jwt.verify(token, secret(), { algorithms: ['HS256'], clockTimestamp: seconds(now) }) as jwt.JwtPayload;
    return { sub: String(claims.sub), role: claims.role === 'admin' ? 'admin' : 'user' };
  } catch {
    throw unauthorized('Your login has expired. Please log in again.');
  }
}

/** A fresh random refresh token, and the hash we store for it. */
export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

/** SHA-256 of a token (hex), so stored tokens can't be used if the database leaks. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
