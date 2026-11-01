/**
 * chaupal.ts (routes) — a Toli's chat, Chaupal (login required):
 *
 *   GET  /api/tolis/:id/messages?after=<iso>&limit=50   → { messages }  oldest → newest
 *                                                         (without `after`: the latest 50)
 *   POST /api/tolis/:id/messages  { text, clientId, replyTo?, photoIds?, card? }
 *                                                       → 201 { message }  (200 with the same message
 *                                                         when that clientId was already sent)
 *   POST /api/tolis/:id/messages/photos   raw image     → 201 { photo: { id, url } }
 *   POST /api/tolis/:id/read                             → 204  I've read the chat (clears unread)
 *
 * In announcement mode only leaders write — and members they've allowed (one message, or for
 * a while; see Anurodh). @username mentions count for members only. Photos: up to 4 per
 * message, each your own upload. Outsiders get 404 for everything.
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Message, User } from '../db/models/index.js';
import { badRequest, forbidden } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { messageViews } from '../services/chaupal.js';
import { imageType, rawImageBody } from '../services/images.js';
import type { PhotoStore } from '../services/photos.js';
import { signedPhotoUrl } from '../services/photoLinks.js';
import { loadMember } from '../services/tolis.js';
import { canPost, type ToliRole } from '../services/toliRules.js';

/** Messages per page. */
const PAGE = 50;
/** Photos per message. */
const MAX_PHOTOS = 4;
/** Largest chat photo (the website shrinks photos first). */
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

/** A new message: some text, or at least a photo or a card. */
const messageSchema = z
  .object({
    text: z.string().trim().max(2000, 'Keep messages under 2,000 characters.').default(''),
    clientId: z.string().min(6).max(64),
    replyTo: z.string().optional(),
    photoIds: z.array(z.string()).max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos per message.`).default([]),
    card: z.object({ type: z.enum(['place', 'plan']), id: z.string().min(1).max(64) }).optional(),
  })
  .refine((m) => m.text || m.photoIds.length || m.card, 'Write something first.');

/** The Chaupal routes. */
export function chaupalRoutes(deps: { now: () => Date; photos: PhotoStore }): Router {
  const router = Router();
  const auth = requireAuth(deps.now);

  // GET /tolis/:id/messages — the chat, oldest → newest.
  router.get('/tolis/:id/messages', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    const { after, limit } = z.object({ after: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(PAGE).default(PAGE) }).parse(req.query);
    const toliId = toli._id.toString();
    const messages = after
      ? await Message.find({ toliId, createdAt: { $gt: after } }).sort({ createdAt: 1, _id: 1 }).limit(limit)
      : (await Message.find({ toliId }).sort({ createdAt: -1, _id: -1 }).limit(limit)).reverse();
    res.json({ messages: await messageViews(messages, me, deps.now()) });
  });

  // POST /tolis/:id/messages — say something.
  router.post('/tolis/:id/messages', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const input = messageSchema.parse(req.body);
    const toliId = toli._id.toString();
    const now = deps.now();

    // Sent before (an offline retry)? Answer with the stored one.
    const earlier = await Message.findOne({ toliId, authorId: me, clientId: input.clientId });
    if (earlier) {
      res.json({ message: (await messageViews([earlier], me, now))[0] });
      return;
    }
    if (!canPost({ role: member.role as ToliRole, postUntil: member.postUntil?.toISOString() ?? null, oneMessage: member.oneMessage }, toli.announcementMode, now.toISOString())) {
      throw forbidden('Announcement mode — raise your hand to ask.');
    }
    // Replies point at this Toli's messages; photos must be the sender's own uploads.
    if (input.replyTo && !(isValidObjectId(input.replyTo) && (await Message.exists({ _id: input.replyTo, toliId })))) throw badRequest('That message isn’t in this chat.');
    for (const id of input.photoIds) {
      if (!isValidObjectId(id) || (await deps.photos.ownerOf(id)) !== me) throw badRequest('Add your own photos only.');
    }
    // @username mentions: members only.
    const names = [...input.text.matchAll(/@([a-z0-9_]{3,20})/gi)].map((m) => m[1].toLowerCase());
    const mentioned = names.length ? await User.find({ username: { $in: names }, _id: { $in: toli.members.map((m) => m.userId) } }, { _id: 1 }).lean() : [];

    const message = await Message.create({
      toliId,
      authorId: me,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      mentions: mentioned.map((u) => u._id.toString()),
      photoIds: input.photoIds,
      ...(input.card ? { card: input.card } : {}),
      clientId: input.clientId,
      createdAt: now,
    });
    // A one-message allowance is used up.
    if (member.oneMessage) {
      member.oneMessage = false;
      await toli.save();
    }
    res.status(201).json({ message: (await messageViews([message], me, now))[0] });
  });

  // POST /tolis/:id/messages/photos — upload one photo for a message (raw bytes, shrunk by the website).
  router.post('/tolis/:id/messages/photos', auth, rawImageBody, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const type = imageType(bytes);
    if (!type || bytes.length > MAX_PHOTO_BYTES) throw badRequest('Please choose a JPG, PNG or WebP image under 1.5 MB');
    // The photo record keeps the Toli id where journals keep a trip's.
    const { id } = await deps.photos.put({ ownerId: me, itineraryId: toli._id.toString(), bytes, contentType: type });
    res.status(201).json({ photo: { id, url: signedPhotoUrl(id, me, deps.now()) } });
  });

  // POST /tolis/:id/read — I've caught up with the chat.
  router.post('/tolis/:id/read', auth, async (req, res) => {
    const { toli, member } = await loadMember(String(req.params.id), currentUser(req).id);
    member.lastReadAt = deps.now();
    await toli.save();
    res.status(204).end();
  });

  return router;
}
