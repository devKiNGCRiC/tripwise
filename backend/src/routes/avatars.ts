/**
 * avatars.ts (routes) — profile photos:
 *
 *   PUT    /api/me/avatar        raw image body (≤ 300 KB, JPG/PNG/WebP) → { profile }
 *   DELETE /api/me/avatar        remove it                              → { profile }
 *   GET    /api/avatars/:userId  the image (cached for a year; the ?v= in the URL changes
 *                                whenever the photo does)
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { Avatar, User } from '../db/models/index.js';
import { profileOf } from '../db/toPublic.js';
import { badRequest, notFound, unauthorized } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { imageType, rawImageBody } from '../services/images.js';

/** Largest profile photo accepted. */
const MAX_AVATAR_BYTES = 300 * 1024;
/** The message for anything we can't accept. */
const BAD_IMAGE = 'Please choose a JPG, PNG or WebP image under 300 KB';

/** The avatar routes. */
export function avatarRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  // PUT /me/avatar — save a new photo (already cropped and resized by the website).
  router.put('/me/avatar', auth, rawImageBody, async (req, res) => {
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const type = imageType(bytes);
    if (!type || bytes.length > MAX_AVATAR_BYTES) throw badRequest(BAD_IMAGE);

    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    await Avatar.updateOne({ userId: user._id }, { data: bytes, contentType: type, updatedAt: now() }, { upsert: true });
    // A new version number makes a new URL, so browsers fetch the new photo.
    user.avatar = { version: Math.max(now().getTime(), (user.avatar?.version ?? 0) + 1) };
    await user.save();
    res.json({ profile: profileOf(user) });
  });

  // DELETE /me/avatar — back to initials.
  router.delete('/me/avatar', auth, async (req, res) => {
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    await Avatar.deleteOne({ userId: user._id });
    user.avatar = null;
    await user.save();
    res.json({ profile: profileOf(user) });
  });

  // GET /avatars/:userId — the photo itself (public, like a profile picture anywhere).
  router.get('/avatars/:userId', async (req, res) => {
    const userId = String(req.params.userId);
    if (!isValidObjectId(userId)) throw notFound();
    const avatar = await Avatar.findOne({ userId }).lean();
    if (!avatar) throw notFound();
    res.setHeader('Content-Type', avatar.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(avatar.data.buffer ?? avatar.data));
  });

  return router;
}
