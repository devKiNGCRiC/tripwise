/**
 * sessions.ts — "stay logged in" for 30 days, safely.
 *
 * Each login starts a session *family*. Every refresh retires the presented token and
 * issues a new one in the same family ("rotation"). So each refresh token works once —
 * with one exception: two browser tabs often refresh at the same moment with the same
 * cookie. A token retired less than 30 seconds ago is therefore still accepted (it gets a
 * fresh token too). A retired token showing up *later* can only mean someone copied it, so
 * the whole family is cancelled and everyone using it must log in again.
 *
 * This works the same whether the token arrives in a cookie (website) or, later, in a
 * request body from a phone app.
 */
import { randomUUID } from 'node:crypto';
import { Session } from '../db/models/index.js';
import { unauthorized } from '../lib/errors.js';
import { hashToken, newRefreshToken } from './tokens.js';

/** How long a login lasts without being used. */
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** How long a just-retired token is still accepted (two tabs refreshing together). */
export const REUSE_GRACE_MS = 30 * 1000;

/** The message for every "please log in again" answer. */
const EXPIRED = 'Session expired. Please log in again.';

/** Start a session (a new family unless one is given); returns the token for the cookie. */
export async function createSession(userId: string, now: Date, familyId: string = randomUUID()): Promise<string> {
  const { token, hash } = newRefreshToken();
  await Session.create({ userId, tokenHash: hash, familyId, expiresAt: new Date(now.getTime() + REFRESH_TTL_MS) });
  return token;
}

/** Swap a refresh token for a new one. Throws 401 if it is unknown, expired, cancelled or stolen. */
export async function rotateSession(token: string, now: Date): Promise<{ userId: string; token: string }> {
  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= now.getTime()) throw unauthorized(EXPIRED);

  const userId = session.userId.toString();

  // Already swapped once: fine within the grace window, theft after it.
  if (session.rotatedAt) {
    if (now.getTime() - session.rotatedAt.getTime() < REUSE_GRACE_MS) {
      return { userId, token: await createSession(userId, now, session.familyId) };
    }
    await Session.updateMany({ familyId: session.familyId }, { revokedAt: now });
    throw unauthorized(EXPIRED);
  }

  // Normal case: retire this token and issue the next one in the family.
  // The filter on `rotatedAt` makes two simultaneous swaps safe: only one marks it.
  await Session.updateOne({ _id: session._id, rotatedAt: { $exists: false } }, { rotatedAt: now });
  return { userId, token: await createSession(userId, now, session.familyId) };
}

/** Log out: cancel the token's whole family (so retired siblings can't be used either). */
export async function revokeSession(token: string, now: Date): Promise<void> {
  const session = await Session.findOne({ tokenHash: hashToken(token) });
  if (session) await Session.updateMany({ familyId: session.familyId }, { revokedAt: now });
}

/** Cancel every login a traveller has (password changed or reset, "sign out everywhere"). */
export async function revokeAllSessions(userId: string, now: Date): Promise<void> {
  await Session.updateMany({ userId, revokedAt: { $exists: false } }, { revokedAt: now });
}
