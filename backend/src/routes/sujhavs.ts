/**
 * sujhavs.ts (routes) — suggestions (Sujhav) on a Toli's Sahyatra (login required):
 *
 *   POST /api/tolis/:id/sujhavs                  { change, note? } → 201 { sujhav }  any Sahyatri
 *   GET  /api/tolis/:id/sujhavs?status=open|approved|declined     → { sujhavs }       newest first
 *   PUT  /api/tolis/:id/sujhavs/:sid/vote        { vote: 1|-1|0 }  → { sujhav }        0 clears my vote
 *   POST /api/tolis/:id/sujhavs/:sid/approve                       → { sujhav }        leaders; applied to the plan
 *   POST /api/tolis/:id/sujhavs/:sid/decline     { reason? }       → { sujhav }        leaders
 *
 * Nobody but leaders changes the plan directly; a suggestion is how everyone else asks. One
 * that no longer fits the plan (the stop it names has moved or changed) is refused with 409
 * and stays open, so the plan is never edited in the wrong place.
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Itinerary, Sujhav, User } from '../db/models/index.js';
import { clash, notFound } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { postCard } from '../services/chaupal.js';
import { loadMember, logActivity, requireLeader } from '../services/tolis.js';
import { applySujhav, type DayLike, type SujhavChange } from '../services/toliRules.js';

/** Longest trip a suggestion may make. */
const MAX_DAYS = 14;

/** A suggested new stop. */
const stopSchema = z.object({
  time: z.enum(['morning', 'afternoon', 'evening']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  title: z.string().trim().min(1).max(120),
  // Every stop in a plan has a description; a suggestion without one gets a simple line.
  description: z.string().trim().max(400).optional().transform((d) => d || 'Suggested by the Toli.'),
});
/** Which stop a change is about (with its title when suggested, to spot a changed plan). */
const at = { day: z.number().int().min(1).max(MAX_DAYS), index: z.number().int().min(0), title: z.string().min(1) };
/** Every kind of change. */
const changeSchema = z.discriminatedUnion(
  'kind',
  [
    z.object({ kind: z.literal('add-stop'), day: at.day, at: z.number().int().min(0), stop: stopSchema }),
    z.object({ kind: z.literal('remove-stop'), ...at }),
    z.object({ kind: z.literal('swap-stop'), ...at, stop: stopSchema }),
    z.object({ kind: z.literal('move-stop'), ...at, toDay: at.day, toIndex: z.number().int().min(0) }),
    z.object({ kind: z.literal('retheme-day'), day: at.day, theme: z.string().trim().min(1).max(80) }),
    z.object({ kind: z.literal('add-day'), theme: z.string().trim().min(1).max(80) }),
    z.object({ kind: z.literal('change-transport'), ...at, mode: z.enum(['walk', 'auto', 'cab', 'bus', 'train', 'boat']) }),
  ],
  { error: 'That suggestion isn’t one TripWise understands.' },
);
/** A new suggestion. */
const createSchema = z.object({ change: changeSchema, note: z.string().trim().max(280, 'Keep the note under 280 characters.').optional() });

/** A suggestion as the Toli sees it. */
async function viewOf(sujhav: InstanceType<typeof Sujhav>, viewerId: string) {
  const people = await User.find({ _id: { $in: [sujhav.authorId, ...(sujhav.decidedBy ? [sujhav.decidedBy] : [])] } }, { name: 1, username: 1 }).lean();
  const who = (id?: string | null) => {
    const user = people.find((p) => p._id.toString() === id);
    return user ? { id: user._id.toString(), name: user.name, username: user.username ?? '' } : null;
  };
  const votes = [...sujhav.votes.values()];
  return {
    id: sujhav._id.toString(),
    author: who(sujhav.authorId),
    change: sujhav.change as SujhavChange,
    ...(sujhav.note ? { note: sujhav.note } : {}),
    up: votes.filter((v) => v > 0).length,
    down: votes.filter((v) => v < 0).length,
    myVote: sujhav.votes.get(viewerId) ?? 0,
    status: sujhav.status,
    ...(sujhav.decidedBy ? { decidedBy: who(sujhav.decidedBy), decidedAt: sujhav.decidedAt?.toISOString() } : {}),
    ...(sujhav.reason ? { reason: sujhav.reason } : {}),
    createdAt: (sujhav.get('createdAt') as Date).toISOString(),
  };
}

/** The Sujhav routes. */
export function sujhavRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  /** An open-or-closed suggestion of this Toli (404 otherwise). */
  async function findSujhav(toliId: string, sid: string) {
    const sujhav = isValidObjectId(sid) ? await Sujhav.findOne({ _id: sid, toliId }) : null;
    if (!sujhav) throw notFound('We couldn’t find that suggestion.');
    return sujhav;
  }

  // POST /tolis/:id/sujhavs — suggest a change.
  router.post('/tolis/:id/sujhavs', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    if (!toli.tripId) throw clash('Plan the Sahyatra first — then everyone can suggest changes.');
    const { change, note } = createSchema.parse(req.body);
    const at = now();
    const sujhav = await Sujhav.create({ toliId: toli._id.toString(), authorId: me, change, note });
    await logActivity(toli._id.toString(), me, 'suggested', { sujhavId: sujhav._id.toString(), kind: change.kind }, at);
    await postCard(toli._id.toString(), me, { type: 'sujhav', id: sujhav._id.toString() }, at);
    res.status(201).json({ sujhav: await viewOf(sujhav, me) });
  });

  // GET /tolis/:id/sujhavs — the Toli's suggestions, newest first.
  router.get('/tolis/:id/sujhavs', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    const status = z.enum(['open', 'approved', 'declined']).optional().parse(req.query.status);
    const sujhavs = await Sujhav.find({ toliId: toli._id.toString(), ...(status ? { status } : {}) }).sort({ createdAt: -1, _id: -1 }).limit(100);
    res.json({ sujhavs: await Promise.all(sujhavs.map((s) => viewOf(s, me))) });
  });

  // PUT /tolis/:id/sujhavs/:sid/vote — 👍 (1), 👎 (−1) or clear (0).
  router.put('/tolis/:id/sujhavs/:sid/vote', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    const sujhav = await findSujhav(toli._id.toString(), String(req.params.sid));
    if (sujhav.status !== 'open') throw clash('This suggestion has already been decided.');
    const { vote } = z.object({ vote: z.union([z.literal(1), z.literal(-1), z.literal(0)]) }).parse(req.body);
    if (vote === 0) sujhav.votes.delete(me);
    else sujhav.votes.set(me, vote);
    await sujhav.save();
    res.json({ sujhav: await viewOf(sujhav, me) });
  });

  // POST /tolis/:id/sujhavs/:sid/approve — apply it to the Sahyatra (leaders).
  router.post('/tolis/:id/sujhavs/:sid/approve', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    requireLeader(member);
    const sujhav = await findSujhav(toli._id.toString(), String(req.params.sid));
    if (sujhav.status !== 'open') throw clash('This suggestion has already been decided.');
    const trip = toli.tripId ? await Itinerary.findById(toli.tripId) : null;
    if (!trip) throw clash('This Toli has no Sahyatra to change.');

    const change = sujhav.change as SujhavChange;
    const result = applySujhav(trip.toObject().days as unknown as DayLike[], change, MAX_DAYS);
    if (!result.ok) {
      throw clash(result.reason === 'too-long' ? `Trips can be up to ${MAX_DAYS} days.` : 'The plan has changed since this was suggested — ask for a fresh suggestion.');
    }
    trip.set('days', result.days);
    // A new day moves the trip's end date along with it.
    if (change.kind === 'add-day' && trip.request) trip.request.endDate = result.days[result.days.length - 1].date;
    await trip.save();

    const at = now();
    Object.assign(sujhav, { status: 'approved', decidedBy: me, decidedAt: at });
    await sujhav.save();
    await logActivity(toli._id.toString(), me, 'approved', { sujhavId: sujhav._id.toString(), authorId: sujhav.authorId }, at);
    res.json({ sujhav: await viewOf(sujhav, me) });
  });

  // POST /tolis/:id/sujhavs/:sid/decline — say no, with an optional reason (leaders).
  router.post('/tolis/:id/sujhavs/:sid/decline', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    requireLeader(member);
    const sujhav = await findSujhav(toli._id.toString(), String(req.params.sid));
    if (sujhav.status !== 'open') throw clash('This suggestion has already been decided.');
    const { reason } = z.object({ reason: z.string().trim().max(200).optional() }).parse(req.body ?? {});
    const at = now();
    Object.assign(sujhav, { status: 'declined', decidedBy: me, decidedAt: at, ...(reason ? { reason } : {}) });
    await sujhav.save();
    await logActivity(toli._id.toString(), me, 'declined', { sujhavId: sujhav._id.toString(), authorId: sujhav.authorId }, at);
    res.json({ sujhav: await viewOf(sujhav, me) });
  });

  return router;
}
