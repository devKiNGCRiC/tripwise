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
 *   POST /api/tolis/:id/anurodh   { about }              → 201 { anurodh }  raise my hand (announcement mode)
 *   GET  /api/tolis/:id/anurodh                          → { requests, mine } open requests (leaders only) + my latest
 *   POST /api/tolis/:id/anurodh/:rid/decide { action: 'one'|'30m'|'1h'|'trip'|'reply'|'decline', reply? }
 *                                                       → { anurodh }  leaders
 * Raising a hand: one open request each; 10 minutes' wait after a decline; leaders can turn a
 * person's requests off. A private reply is seen only by the person who asked.
 *
 * In announcement mode only leaders write — and members they've allowed (one message, or for
 * a while; see Anurodh). @username mentions count for members only. Photos: up to 4 per
 * message, each your own upload. Outsiders get 404 for everything.
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Anurodh, Itinerary, Message, User } from '../db/models/index.js';
import { badRequest, clash, forbidden, notFound, quotaExceeded } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { messageViews } from '../services/chaupal.js';
import { imageType, rawImageBody } from '../services/images.js';
import type { PhotoStore } from '../services/photos.js';
import { signedPhotoUrl } from '../services/photoLinks.js';
import { loadMember, requireLeader } from '../services/tolis.js';
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

/** How long after a declined request before asking again. */
const ASK_AGAIN_MS = 10 * 60_000;
/** Writing windows a leader can grant. */
const WINDOW_MS = { '30m': 30 * 60_000, '1h': 60 * 60_000 } as const;
/** "The whole trip" when there's no plan yet. */
const NO_TRIP_WINDOW_MS = 30 * 24 * 60 * 60_000;

/** A leader's decision on a raised hand. */
const decideSchema = z
  .object({ action: z.enum(['one', '30m', '1h', 'trip', 'reply', 'decline']), reply: z.string().trim().max(500).optional() })
  .refine((d) => d.action !== 'reply' || !!d.reply, 'Write the reply.');

/** A raised hand as shown (`withReply`: include the private reply — for its asker only). */
async function anurodhView(a: InstanceType<typeof Anurodh>, withReply: boolean) {
  const user = await User.findById(a.userId, { name: 1, username: 1 }).lean();
  return {
    id: a._id.toString(),
    user: user ? { id: user._id.toString(), name: user.name, username: user.username ?? '' } : { id: a.userId, name: 'Former Sahyatri', username: '' },
    about: a.about,
    status: a.status,
    ...(a.grant ? { grant: a.grant } : {}),
    ...(withReply && a.reply ? { reply: a.reply } : {}),
    createdAt: a.createdAt.toISOString(),
  };
}

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

  // POST /tolis/:id/anurodh — raise my hand to speak (announcement mode).
  router.post('/tolis/:id/anurodh', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const now = deps.now();
    const { about } = z.object({ about: z.string().trim().min(1, 'Say what it’s about.').max(200, 'Keep it under 200 characters.') }).parse(req.body);
    if (canPost({ role: member.role as ToliRole, postUntil: member.postUntil?.toISOString() ?? null, oneMessage: member.oneMessage }, toli.announcementMode, now.toISOString())) {
      throw clash('You can already write in Chaupal.');
    }
    if (member.requestsOff) throw forbidden('Your leaders have turned off requests for you.');
    const toliId = toli._id.toString();
    if (await Anurodh.exists({ toliId, userId: me, status: 'open' })) throw clash('Your hand is already raised.');
    // A short wait after a decline, so nobody keeps asking.
    const declined = await Anurodh.findOne({ toliId, userId: me, status: 'declined' }).sort({ decidedAt: -1 }).lean();
    const waitMs = declined?.decidedAt ? declined.decidedAt.getTime() + ASK_AGAIN_MS - now.getTime() : 0;
    if (waitMs > 0) throw quotaExceeded(`Try again in ${Math.ceil(waitMs / 60_000)} minutes.`);
    const anurodh = await Anurodh.create({ toliId, userId: me, about, createdAt: now });
    res.status(201).json({ anurodh: await anurodhView(anurodh, true) });
  });

  // GET /tolis/:id/anurodh — open requests (leaders) and my latest.
  router.get('/tolis/:id/anurodh', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const toliId = toli._id.toString();
    const leads = member.role === 'sutradhar' || member.role === 'sah';
    const open = leads ? await Anurodh.find({ toliId, status: 'open' }).sort({ createdAt: 1 }) : [];
    const mine = await Anurodh.findOne({ toliId, userId: me }).sort({ createdAt: -1 });
    res.json({ requests: await Promise.all(open.map((a) => anurodhView(a, false))), mine: mine ? await anurodhView(mine, true) : null });
  });

  // POST /tolis/:id/anurodh/:rid/decide — allow, answer privately, or decline (leaders).
  router.post('/tolis/:id/anurodh/:rid/decide', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    requireLeader(member);
    const rid = String(req.params.rid);
    const anurodh = isValidObjectId(rid) ? await Anurodh.findOne({ _id: rid, toliId: toli._id.toString() }) : null;
    if (!anurodh) throw notFound('We couldn’t find that request.');
    if (anurodh.status !== 'open') throw clash('This request has already been answered.');
    const { action, reply } = decideSchema.parse(req.body);
    const now = deps.now();
    const asker = toli.members.find((m) => m.userId.toString() === anurodh.userId);

    if (action === 'decline') anurodh.status = 'declined';
    else if (action === 'reply') Object.assign(anurodh, { status: 'answered', reply });
    else {
      // Allowed: the asker may write once, or until a time.
      Object.assign(anurodh, { status: 'granted', grant: action });
      if (asker) {
        if (action === 'one') asker.oneMessage = true;
        else if (action === 'trip') {
          const trip = toli.tripId ? await Itinerary.findById(toli.tripId, { 'request.endDate': 1 }).lean() : null;
          asker.postUntil = trip?.request?.endDate ? new Date(`${trip.request.endDate}T23:59:59+05:30`) : new Date(now.getTime() + NO_TRIP_WINDOW_MS);
        } else asker.postUntil = new Date(now.getTime() + WINDOW_MS[action]);
        await toli.save();
      }
    }
    Object.assign(anurodh, { decidedBy: me, decidedAt: now });
    await anurodh.save();
    res.json({ anurodh: await anurodhView(anurodh, false) });
  });


  return router;
}
