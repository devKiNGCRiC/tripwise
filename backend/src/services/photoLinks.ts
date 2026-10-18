/**
 * photoLinks.ts — photo addresses that work inside an <img>.
 *
 * Browsers load <img> pictures without our login token, so a photo address on its own
 * can't tell us who is looking. When the API hands someone a photo link, it adds who it was
 * made for and until when, plus a signature only our server can make:
 *
 *   /api/photos/<id>?v=<viewer id or "anon">&exp=<unix seconds>&sig=<HMAC>
 *
 * The photo route checks the signature and the time, then still asks "may this viewer see
 * this photo *right now*?" — so hiding a journal or blocking someone works at once. Links
 * last up to two hours and stay the same within an hour (so the browser can reuse them).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** One hour, in seconds. */
const HOUR = 3600;

/** The signing key (the same secret that signs login tokens, with a different purpose label). */
function key(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return `photos:${secret}`;
}

/** The signature for one photo, viewer and expiry. */
function signature(photoId: string, viewer: string, exp: number): string {
  return createHmac('sha256', key()).update(`${photoId}|${viewer}|${exp}`).digest('base64url');
}

/** A photo link made for `viewerId` (null = a logged-out visitor). */
export function signedPhotoUrl(photoId: string, viewerId: string | null, now: Date): string {
  const viewer = viewerId ?? 'anon';
  // Expires at the end of the next whole hour: 1–2 hours from now, stable within the hour.
  const exp = (Math.floor(now.getTime() / 1000 / HOUR) + 2) * HOUR;
  return `/api/photos/${photoId}?v=${viewer}&exp=${exp}&sig=${signature(photoId, viewer, exp)}`;
}

/**
 * Who a photo link was made for, if its signature is genuine and it hasn't expired:
 * a user id, null for "anon", or undefined when the link isn't valid.
 */
export function viewerFromLink(photoId: string, query: Record<string, unknown>, now: Date): string | null | undefined {
  const viewer = typeof query.v === 'string' ? query.v : '';
  const exp = Number(query.exp);
  const sig = typeof query.sig === 'string' ? query.sig : '';
  if (!viewer || !Number.isFinite(exp) || !sig || exp * 1000 <= now.getTime()) return undefined;
  const expected = Buffer.from(signature(photoId, viewer, exp));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined;
  return viewer === 'anon' ? null : viewer;
}
