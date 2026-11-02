/**
 * yatra.ts (routes) — being together on the trip (login required; Toli members only):
 *
 *   POST   /api/tolis/:id/splits                         { day | null, dharas, sangam? } → 201 { split }
 *            leaders' splits are active; a Sahyatri's waits for a leader ('proposed')
 *   GET    /api/tolis/:id/splits?day=n                   → { splits }
 *   POST   /api/tolis/:id/splits/:sid/approve            → { split }  leaders
 *   DELETE /api/tolis/:id/splits/:sid                    → 204        leaders (or the proposer while proposed)
 *   POST   /api/tolis/:id/splits/:sid/dharas/:did/join   → { split }  leaves any other Dhara of the split
 *   POST   /api/tolis/:id/splits/:sid/dharas/:did/leave  → { split }
 *   POST   /api/tolis/:id/splits/:sid/here               → { split }  "I'm here" at the Sangam
 *   DELETE /api/tolis/:id/splits/:sid/here               → { split }
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { ToliSplit } from '../db/models/index.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { peopleOf } from '../services/lekha.js';
import { loadMember, logActivity, requireLeader } from '../services/tolis.js';
import { isLeader, type ToliRole } from '../services/toliRules.js';
import { headcount } from '../services/yatraRules.js';

/** A new split. */
const splitSchema = z.object({
  day: z.number().int().min(1).max(30).nullable(),
  dharas: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Give each Dhara a name.').max(40),
        stops: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
        leadId: z.string().optional(),
      }),
    )
    .min(2, 'A split needs at least two Dharas.')
    .max(6, 'At most six Dharas.'),
  sangam: z.object({ place: z.string().trim().min(1, 'Say where to meet.').max(120), at: z.iso.datetime() }).optional(),
});

/** A stored split. */
type SplitDoc = InstanceType<typeof ToliSplit>;

/** A split as members see it (people as name cards; the Sangam headcount). */
async function splitView(split: SplitDoc, memberIds: string[]) {
  const person = await peopleOf([...memberIds, ...split.dharas.flatMap((d) => [...d.memberIds, ...(d.leadId ? [d.leadId] : [])])]);
  const count = headcount(memberIds, split.here);
  return {
    id: split._id.toString(),
    day: split.day ?? null,
    status: split.status,
    dharas: split.dharas.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      stops: d.stops,
      members: d.memberIds.filter((id) => memberIds.includes(id)).map(person),
      ...(d.leadId ? { lead: person(d.leadId) } : {}),
    })),
    sangam: split.sangam ? { place: split.sangam.place, at: split.sangam.at.toISOString() } : null,
    headcount: { here: count.here.map(person), missing: count.missing.map(person) },
    createdBy: person(split.createdBy),
  };
}

/** The on-the-trip routes. */
export function yatraRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  /** The caller's Toli, membership, member ids, and the split in the URL (404 if not this Toli's). */
  async function loadSplit(toliId: string, splitId: string, userId: string) {
    const { toli, member } = await loadMember(toliId, userId);
    const split = isValidObjectId(splitId) ? await ToliSplit.findOne({ _id: splitId, toliId: toli._id.toString() }) : null;
    if (!split) throw notFound('That split isn’t here.');
    return { toli, member, split, memberIds: toli.members.map((m) => m.userId.toString()) };
  }

  // POST /tolis/:id/splits — split a day (or fix Dharas for the whole trip).
  router.post('/tolis/:id/splits', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const input = splitSchema.parse(req.body);
    const memberIds = toli.members.map((m) => m.userId.toString());
    if (input.day === null) {
      // Fixed Dharas are for big organised trips.
      if (!['college', 'office'].includes(toli.type)) throw badRequest('Fixed Dharas are for college and office Tolis.');
      requireLeader(member, 'Only leaders set up fixed Dharas.');
    } else if (!input.sangam) {
      throw badRequest('Say where and when the Dharas meet again (the Sangam).');
    }
    if (input.dharas.some((d) => d.leadId && !memberIds.includes(d.leadId))) throw badRequest('A Dhara’s lead must be in this Toli.');

    const split = await ToliSplit.create({
      toliId: toli._id.toString(),
      day: input.day,
      dharas: input.dharas.map((d) => ({ name: d.name, stops: d.stops ?? [], memberIds: [], ...(d.leadId ? { leadId: d.leadId } : {}) })),
      sangam: input.day === null || !input.sangam ? null : { place: input.sangam.place, at: new Date(input.sangam.at) },
      here: [],
      status: isLeader(member.role as ToliRole) ? 'active' : 'proposed',
      createdBy: me,
      createdAt: now(),
    });
    await logActivity(toli._id.toString(), me, 'split-created', { day: input.day, status: split.status }, now());
    res.status(201).json({ split: await splitView(split, memberIds) });
  });

  // GET /tolis/:id/splits?day=n — the Toli's splits (one day's, when asked).
  router.get('/tolis/:id/splits', auth, async (req, res) => {
    const { toli } = await loadMember(String(req.params.id), currentUser(req).id);
    const day = req.query.day === undefined ? undefined : Number(req.query.day);
    const splits = await ToliSplit.find({ toliId: toli._id.toString(), ...(day !== undefined && Number.isInteger(day) ? { day } : {}) }).sort({ day: 1, createdAt: 1 });
    const memberIds = toli.members.map((m) => m.userId.toString());
    res.json({ splits: await Promise.all(splits.map((s) => splitView(s, memberIds))) });
  });

  // POST /tolis/:id/splits/:sid/approve — a leader approves a Sahyatri's split.
  router.post('/tolis/:id/splits/:sid/approve', auth, async (req, res) => {
    const { member, split, memberIds } = await loadSplit(String(req.params.id), String(req.params.sid), currentUser(req).id);
    requireLeader(member);
    split.status = 'active';
    await split.save();
    res.json({ split: await splitView(split, memberIds) });
  });

  // DELETE /tolis/:id/splits/:sid — leaders, or the proposer withdrawing a proposed one.
  router.delete('/tolis/:id/splits/:sid', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { member, split } = await loadSplit(String(req.params.id), String(req.params.sid), me);
    const ownProposal = split.status === 'proposed' && split.createdBy === me;
    if (!ownProposal && !isLeader(member.role as ToliRole)) throw forbidden('Only leaders can remove a split.');
    await split.deleteOne();
    res.status(204).end();
  });

  // POST /tolis/:id/splits/:sid/dharas/:did/join|leave — move between Dharas (one per split).
  for (const action of ['join', 'leave'] as const) {
    router.post(`/tolis/:id/splits/:sid/dharas/:did/${action}`, auth, async (req, res) => {
      const me = currentUser(req).id;
      const { split, memberIds } = await loadSplit(String(req.params.id), String(req.params.sid), me);
      const dhara = split.dharas.find((d) => d._id.toString() === String(req.params.did));
      if (!dhara) throw notFound('That Dhara isn’t here.');
      for (const d of split.dharas) d.memberIds = d.memberIds.filter((id) => id !== me);
      if (action === 'join') dhara.memberIds.push(me);
      await split.save();
      res.json({ split: await splitView(split, memberIds) });
    });
  }

  // POST|DELETE /tolis/:id/splits/:sid/here — "I'm here" at the Sangam (and taking it back).
  router.post('/tolis/:id/splits/:sid/here', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, split, memberIds } = await loadSplit(String(req.params.id), String(req.params.sid), me);
    if (!split.here.includes(me)) {
      split.here.push(me);
      await split.save();
      await logActivity(toli._id.toString(), me, 'sangam-here', { day: split.day }, now());
    }
    res.json({ split: await splitView(split, memberIds) });
  });
  router.delete('/tolis/:id/splits/:sid/here', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { split, memberIds } = await loadSplit(String(req.params.id), String(req.params.sid), me);
    split.here = split.here.filter((id) => id !== me);
    await split.save();
    res.json({ split: await splitView(split, memberIds) });
  });

  return router;
}
