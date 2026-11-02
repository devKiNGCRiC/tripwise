/**
 * kushal.ts (routes) — Kushal, the family check-in:
 *
 *   GET    /api/me/kushal                 → { contacts, auto, latest }      login required
 *   POST   /api/me/kushal/contacts        { name } → 201 { contact }        up to 5; each gets a link
 *   DELETE /api/me/kushal/contacts/:cid   → 204                             the link stops working
 *   PATCH  /api/me/kushal                 { auto } → { auto }               automatic check-ins on/off
 *   POST   /api/me/kushal/checkin         { lat?, lon?, note? } → { latest } replaces the last one
 *   GET    /api/kushal/:token             → { kushal: { traveller, latest } }  public, no login
 *
 * The family's page shows only the traveller's first name and the latest check-in (nearest place,
 * time, note, and a position rounded to about 1 km). No email, no history, nothing else.
 * Automatic check-ins happen only while TripWise is open on the traveller's phone (the website
 * sends them); TripWise never sends texts or tracks anyone in the background.
 */
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { KushalCheckIn, KushalContact, User } from '../db/models/index.js';
import { clash, notFound } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { nearbyPlace } from '../services/yatra.js';
import { isValidPosition, mapsLink, roundPosition } from '../services/yatraRules.js';

/** Most family contacts per traveller. */
const MAX_CONTACTS = 5;
/** How near a catalogue place must be to name it (km). */
const NEAR_KM = 50;
/** A link's secret: 24 URL-safe characters. */
const newToken = () => randomBytes(18).toString('base64url');

/** A new contact. */
const contactSchema = z.object({ name: z.string().trim().min(1, 'Give their name.').max(40) });
/** A check-in: a position is optional (no GPS, or not wanted). */
const checkInSchema = z
  .object({ lat: z.number().optional(), lon: z.number().optional(), note: z.string().trim().max(140, 'Keep the note under 140 characters.').optional() })
  .refine((c) => (c.lat === undefined && c.lon === undefined) || isValidPosition(c.lat, c.lon), 'That isn’t a real position.');

/** A stored check-in. */
type CheckInDoc = InstanceType<typeof KushalCheckIn>;

/** The check-in as the traveller sees it. */
const ownView = (c: CheckInDoc) => ({ place: c.place, at: c.at.toISOString(), ...(c.note ? { note: c.note } : {}) });

/** The check-in as the family sees it (rounded position only). */
function familyView(c: CheckInDoc) {
  const has = typeof c.lat === 'number' && typeof c.lon === 'number';
  return {
    place: c.place,
    at: c.at.toISOString(),
    ...(c.note ? { note: c.note } : {}),
    ...(has ? { position: { lat: c.lat!, lon: c.lon! }, mapsLink: mapsLink(c.lat!, c.lon!) } : {}),
  };
}

/** The Kushal routes. */
export function kushalRoutes(deps: { now: () => Date; appUrl: string }): Router {
  const router = Router();
  const auth = requireAuth(deps.now);
  /** The family's link for a token. */
  const linkFor = (token: string) => `${deps.appUrl}/kushal/${token}`;

  // GET /me/kushal — my contacts, the automatic switch and my latest check-in.
  router.get('/me/kushal', auth, async (req, res) => {
    const me = currentUser(req).id;
    const [contacts, user, latest] = await Promise.all([KushalContact.find({ userId: me }).sort({ createdAt: 1 }), User.findById(me, { kushalAuto: 1 }).lean(), KushalCheckIn.findOne({ userId: me })]);
    res.json({
      contacts: contacts.map((c) => ({ id: c._id.toString(), name: c.name, link: linkFor(c.token), createdAt: c.createdAt.toISOString() })),
      auto: !!user?.kushalAuto,
      latest: latest ? ownView(latest) : null,
    });
  });

  // POST /me/kushal/contacts — add someone at home.
  router.post('/me/kushal/contacts', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { name } = contactSchema.parse(req.body);
    if ((await KushalContact.countDocuments({ userId: me })) >= MAX_CONTACTS) throw clash(`Up to ${MAX_CONTACTS} family contacts.`);
    const contact = await KushalContact.create({ userId: me, name, token: newToken(), createdAt: deps.now() });
    res.status(201).json({ contact: { id: contact._id.toString(), name: contact.name, link: linkFor(contact.token), createdAt: contact.createdAt.toISOString() } });
  });

  // DELETE /me/kushal/contacts/:cid — remove a contact; their link stops working.
  router.delete('/me/kushal/contacts/:cid', auth, async (req, res) => {
    const cid = String(req.params.cid);
    const removed = isValidObjectId(cid) ? await KushalContact.findOneAndDelete({ _id: cid, userId: currentUser(req).id }) : null;
    if (!removed) throw notFound('That contact isn’t here.');
    res.status(204).end();
  });

  // PATCH /me/kushal — automatic check-ins (while TripWise is open) on or off.
  router.patch('/me/kushal', auth, async (req, res) => {
    const { auto } = z.object({ auto: z.boolean() }).parse(req.body);
    await User.updateOne({ _id: currentUser(req).id }, { $set: { kushalAuto: auto } });
    res.json({ auto });
  });

  // POST /me/kushal/checkin — "all well": the latest replaces the last.
  router.post('/me/kushal/checkin', auth, async (req, res) => {
    const me = currentUser(req).id;
    const input = checkInSchema.parse(req.body);
    const hasPosition = input.lat !== undefined && input.lon !== undefined;
    const near = hasPosition ? await nearbyPlace(input.lat!, input.lon!, NEAR_KM) : null;
    const place = !hasPosition ? 'Place not shared' : near ? `near ${near.name}` : 'Somewhere without a nearby landmark';
    const rounded = hasPosition ? roundPosition(input.lat!, input.lon!) : null;
    // Only the latest is kept: the new check-in replaces the old one entirely.
    await KushalCheckIn.replaceOne({ userId: me }, { userId: me, place, at: deps.now(), ...(rounded ?? {}), ...(input.note ? { note: input.note } : {}) }, { upsert: true });
    const latest = (await KushalCheckIn.findOne({ userId: me }))!;
    res.json({ latest: ownView(latest) });
  });

  // GET /kushal/:token — the family's page (no login).
  router.get('/kushal/:token', async (req, res) => {
    const contact = await KushalContact.findOne({ token: String(req.params.token) }).lean();
    const user = contact ? await User.findById(contact.userId, { name: 1 }).lean() : null;
    if (!contact || !user) throw notFound('This Kushal link isn’t active.');
    const latest = await KushalCheckIn.findOne({ userId: contact.userId });
    res.json({ kushal: { traveller: user.name.split(' ')[0], latest: latest ? familyView(latest) : null } });
  });

  return router;
}
