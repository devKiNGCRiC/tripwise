/**
 * images.ts — checks that uploads really are images.
 *
 * The browser's Content-Type can say anything, so we look at the file's first bytes (its
 * "magic number"): PNG, JPEG and WebP each start with a known pattern. Anything else is
 * refused before it is stored.
 */
import express from 'express';

/** Image types we accept. */
export type ImageType = 'image/png' | 'image/jpeg' | 'image/webp';

/** The real type of an image from its first bytes, or null if it isn't one we accept. */
export function imageType(bytes: Buffer): ImageType | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/**
 * Body parser for one image upload route: reads the raw bytes whatever the Content-Type.
 * Its cap is generous on purpose — routes check their own (smaller) limit so they can
 * answer with a friendly message instead of a generic "too large".
 */
export const rawImageBody = express.raw({ type: () => true, limit: '3mb' });
