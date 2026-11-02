/**
 * notesPotli.ts (routes) — a Toli's shared notes and its Potli (login required; members only):
 *
 *   GET    /api/tolis/:id/notes              → { notes }  whole-trip notes first, then by day
 *   POST   /api/tolis/:id/notes              { text, day? } → 201 { note }
 *   PATCH  /api/tolis/:id/notes/:nid         { text } → { note }   the author or leaders
 *   DELETE /api/tolis/:id/notes/:nid         → 204                 the author or leaders
 *
 *   GET    /api/tolis/:id/potli              → { group, mine }  my own list is only ever mine
 *   POST   /api/tolis/:id/potli              { text, mine? } → 201 { item }
 *   POST   /api/tolis/:id/potli/:pid/claim   → { item }   "I'll bring it" (409 if someone already is)
 *   DELETE /api/tolis/:id/potli/:pid/claim   → { item }   the claimer lets it go
 *   PATCH  /api/tolis/:id/potli/:pid         { packed } → { item }   the claimer, or the owner of a mine item
 *   DELETE /api/tolis/:id/potli/:pid         → 204        whoever added it, or leaders (group items)
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { PotliItem, ToliNote } from '../db/models/index.js';
import { clash, forbidden, notFound } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { peopleOf } from '../services/lekha.js';
import { loadMember } from '../services/tolis.js';
import { isLeader, type ToliRole } from '../services/toliRules.js';

/** A note's text. */
const noteText = z.string().trim().min(1, 'Write something.').max(500, 'Keep notes under 500 characters.');
/** A new note. */
const noteSchema = z.object({ text: noteText, day: z.number().int().min(1).max(30).nullable().optional() });
/** A new Potli item. */
const potliSchema = z.object({ text: z.string().trim().min(1, 'Say what to pack.').max(80), mine: z.boolean().optional() });

/** Stored records. */
type NoteDoc = InstanceType<typeof ToliNote>;
type PotliDoc = InstanceType<typeof PotliItem>;

/** Notes as `viewerId` sees them. */
async function noteViews(notes: NoteDoc[], viewerId: string, leads: boolean) {
  const person = await peopleOf(notes.map((n) => n.authorId));
  return notes.map((n) => ({
    id: n._id.toString(),
    text: n.text,
    day: n.day ?? null,
    author: person(n.authorId),
    canEdit: leads || n.authorId === viewerId,
    updatedAt: n.updatedAt.toISOString(),
  }));
}

/** Potli items as `viewerId` sees them. */
async function itemViews(items: PotliDoc[], viewerId: string, leads: boolean) {
  const person = await peopleOf(items.flatMap((i) => (i.claimedBy ? [i.claimedBy] : [])));
  return items.map((i) => ({
    id: i._id.toString(),
    text: i.text,
    mine: i.mine,
    claimedBy: i.claimedBy ? person(i.claimedBy) : null,
    packed: i.packed,
    canDelete: i.addedBy === viewerId || (!i.mine && leads),
  }));
}

/** The notes and Potli routes. */
export function notesPotliRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  /** The caller's membership and whether they lead. */
  async function member(toliId: string, userId: string) {
    const { toli, member: m } = await loadMember(toliId, userId);
    return { toliId: toli._id.toString(), leads: isLeader(m.role as ToliRole) };
  }

  /** A note of this Toli (404 otherwise), and whether the caller may change it. */
  async function loadNote(toliId: string, noteId: string, userId: string) {
    const { leads } = await member(toliId, userId);
    const note = isValidObjectId(noteId) ? await ToliNote.findOne({ _id: noteId, toliId }) : null;
    if (!note) throw notFound('That note isn’t here.');
    if (!leads && note.authorId !== userId) throw forbidden('Only whoever wrote it, or a leader, can change a note.');
    return { note, leads };
  }

  /** A Potli item the caller can see (someone else's own item doesn't exist for them). */
  async function loadItem(toliId: string, itemId: string, userId: string) {
    const { leads } = await member(toliId, userId);
    const item = isValidObjectId(itemId) ? await PotliItem.findOne({ _id: itemId, toliId }) : null;
    if (!item || (item.mine && item.addedBy !== userId)) throw notFound('That item isn’t here.');
    return { item, leads };
  }

  // ── Notes ──
  router.get('/tolis/:id/notes', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toliId, leads } = await member(String(req.params.id), me);
    const notes = await ToliNote.find({ toliId });
    // Whole-trip notes first, then day by day, oldest first within each.
    notes.sort((a, b) => (a.day ?? 0) - (b.day ?? 0) || a.createdAt.getTime() - b.createdAt.getTime());
    res.json({ notes: await noteViews(notes, me, leads) });
  });

  router.post('/tolis/:id/notes', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toliId, leads } = await member(String(req.params.id), me);
    const input = noteSchema.parse(req.body);
    const at = now();
    const note = await ToliNote.create({ toliId, authorId: me, day: input.day ?? null, text: input.text, createdAt: at, updatedAt: at });
    res.status(201).json({ note: (await noteViews([note], me, leads))[0] });
  });

  router.patch('/tolis/:id/notes/:nid', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { note, leads } = await loadNote(String(req.params.id), String(req.params.nid), me);
    note.text = z.object({ text: noteText }).parse(req.body).text;
    note.updatedAt = now();
    await note.save();
    res.json({ note: (await noteViews([note], me, leads))[0] });
  });

  router.delete('/tolis/:id/notes/:nid', auth, async (req, res) => {
    const { note } = await loadNote(String(req.params.id), String(req.params.nid), currentUser(req).id);
    await note.deleteOne();
    res.status(204).end();
  });

  // ── Potli ──
  router.get('/tolis/:id/potli', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toliId, leads } = await member(String(req.params.id), me);
    const [group, mine] = await Promise.all([PotliItem.find({ toliId, mine: false }).sort({ createdAt: 1, _id: 1 }), PotliItem.find({ toliId, mine: true, addedBy: me }).sort({ createdAt: 1, _id: 1 })]);
    res.json({ group: await itemViews(group, me, leads), mine: await itemViews(mine, me, leads) });
  });

  router.post('/tolis/:id/potli', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toliId, leads } = await member(String(req.params.id), me);
    const input = potliSchema.parse(req.body);
    const item = await PotliItem.create({ toliId, addedBy: me, text: input.text, mine: !!input.mine, createdAt: now() });
    res.status(201).json({ item: (await itemViews([item], me, leads))[0] });
  });

  router.post('/tolis/:id/potli/:pid/claim', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { item, leads } = await loadItem(String(req.params.id), String(req.params.pid), me);
    if (item.mine) throw clash('That’s on your own list already.');
    if (item.claimedBy && item.claimedBy !== me) throw clash('Someone is already bringing that.');
    item.claimedBy = me;
    await item.save();
    res.json({ item: (await itemViews([item], me, leads))[0] });
  });

  router.delete('/tolis/:id/potli/:pid/claim', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { item, leads } = await loadItem(String(req.params.id), String(req.params.pid), me);
    if (item.claimedBy !== me) throw forbidden('Only whoever is bringing it can let it go.');
    item.claimedBy = null;
    item.packed = false;
    await item.save();
    res.json({ item: (await itemViews([item], me, leads))[0] });
  });

  router.patch('/tolis/:id/potli/:pid', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { item, leads } = await loadItem(String(req.params.id), String(req.params.pid), me);
    const { packed } = z.object({ packed: z.boolean() }).parse(req.body);
    if (!(item.mine ? item.addedBy === me : item.claimedBy === me)) throw forbidden('Only whoever is bringing it can tick it packed.');
    item.packed = packed;
    await item.save();
    res.json({ item: (await itemViews([item], me, leads))[0] });
  });

  router.delete('/tolis/:id/potli/:pid', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { item, leads } = await loadItem(String(req.params.id), String(req.params.pid), me);
    if (item.addedBy !== me && !(leads && !item.mine)) throw forbidden('Only whoever added it, or a leader, can remove it.');
    await item.deleteOne();
    res.status(204).end();
  });

  return router;
}
