/**
 * yatra.ts (mock) — being together on the trip, for demo mode: Dharas and Sangam, "where are my
 * Sahyatris?", notes and the Potli. Same routes, shapes and error codes as the real API; the
 * rules come from the API's own `yatraRules.ts` (`@yatra-rules`), never re-written here.
 * Only the Toli's members see any of it; my own Potli list is only ever mine.
 */
import { http, HttpResponse } from 'msw';
import { isLeader } from '@toli-rules';
import { headcount, isValidPosition, mapsLink, nearestPlace, sharingUntil, type ShareFor } from '@yatra-rules';
import { apiUrl } from '@/lib/api/config';
import type { NewSplit, PotliItem, ToliNote, ToliSplit } from '@/lib/api/types';
import { seedPlaces } from '../data/destinations';
import type { MockNote, MockPotliItem, MockSplit, MockToli } from '../data/tolis';
import { db } from '../db';
import { errorResponse } from './shared';
import { asMember, personOf } from './tolis';

/** Small unique ids. */
let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;
/** Now as ISO text. */
const nowIso = () => new Date().toISOString();
/** Error answers, as the API gives them. */
const invalid = (message: string) => errorResponse(400, 'VALIDATION', message);
const clash = (message: string) => errorResponse(409, 'CONFLICT', message);
const forbidden = (message: string) => errorResponse(403, 'FORBIDDEN', message);
const missing = (message: string) => errorResponse(404, 'NOT_FOUND', message);
/** Add an event to the activity feed. */
const logEvent = (toliId: string, actorId: string, type: string, data: Record<string, unknown>) => db.toliEvents.push({ id: newId('ev'), toliId, actorId, type, data, at: nowIso() });
/** India is 5 h 30 min ahead of UTC. */
const IST_OFFSET_MS = 330 * 60 * 1000;

/** A split as members see it. */
function splitView(s: MockSplit, toli: MockToli): ToliSplit {
  const memberIds = toli.members.map((m) => m.userId);
  const count = headcount(memberIds, s.here);
  return {
    id: s.id,
    day: s.day,
    status: s.status,
    dharas: s.dharas.map((d) => ({ id: d.id, name: d.name, stops: d.stops, members: d.memberIds.filter((id) => memberIds.includes(id)).map(personOf), ...(d.leadId ? { lead: personOf(d.leadId) } : {}) })),
    sangam: s.sangam,
    headcount: { here: count.here.map(personOf), missing: count.missing.map(personOf) },
    createdBy: personOf(s.createdBy),
  };
}

/** The split in the URL, if it's this Toli's. */
const findSplit = (toli: MockToli, sid: unknown) => db.toliSplits.find((s) => s.id === sid && s.toliId === toli.id);

/** The nearest catalogue place within 60 km (as the API does). */
function nearby(lat: number, lon: number) {
  const near = nearestPlace(lat, lon, seedPlaces);
  return near && near.km <= 60 ? near : null;
}

/** When the Toli's Sahyatra ends (end of its last day, India time), if it has one. */
function tripEndOf(toli: MockToli): string | null {
  const trip = toli.tripId ? db.itineraries.find((t) => t.id === toli.tripId) : undefined;
  return trip ? new Date(Date.parse(`${trip.request.endDate}T23:59:59.999Z`) - IST_OFFSET_MS).toISOString() : null;
}

/** The time of the Toli's next Sangam, if any. */
function nextSangamOf(toli: MockToli): string | null {
  const now = nowIso();
  return (
    db.toliSplits
      .filter((s) => s.toliId === toli.id && s.status === 'active' && s.sangam && s.sangam.at > now)
      .map((s) => s.sangam!.at)
      .sort()[0] ?? null
  );
}

/** A note as `viewerId` sees it. */
const noteView = (n: MockNote, viewerId: string, leads: boolean): ToliNote => ({ id: n.id, text: n.text, day: n.day, author: personOf(n.authorId), canEdit: leads || n.authorId === viewerId, updatedAt: n.updatedAt });

/** A Potli item as `viewerId` sees it. */
const itemView = (i: MockPotliItem, viewerId: string, leads: boolean): PotliItem => ({
  id: i.id,
  text: i.text,
  mine: i.mine,
  claimedBy: i.claimedBy ? personOf(i.claimedBy) : null,
  packed: i.packed,
  canDelete: i.addedBy === viewerId || (!i.mine && leads),
});

/** A Potli item the viewer may see (someone else's own item doesn't exist for them). */
const findItem = (toli: MockToli, pid: unknown, viewerId: string) => db.potliItems.find((i) => i.id === pid && i.toliId === toli.id && (!i.mine || i.addedBy === viewerId));

export const yatraHandlers = [
  // ── Dharas and Sangam ──
  http.post(apiUrl('/tolis/:id/splits'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const input = (await request.json()) as NewSplit;
      const memberIds = toli.members.map((m) => m.userId);
      const dharas = input.dharas ?? [];
      if (dharas.length < 2 || dharas.length > 6) return invalid('A split needs two to six Dharas.');
      if (dharas.some((d) => !d.name?.trim() || d.name.trim().length > 40)) return invalid('Give each Dhara a name.');
      if (dharas.some((d) => d.leadId && !memberIds.includes(d.leadId))) return invalid('A Dhara’s lead must be in this Toli.');
      if (input.day === null) {
        if (!['college', 'office'].includes(toli.type)) return invalid('Fixed Dharas are for college and office Tolis.');
        if (!isLeader(member.role)) return forbidden('Only leaders set up fixed Dharas.');
      } else if (!Number.isInteger(input.day) || input.day < 1 || input.day > 30) {
        return invalid('Pick a day of the trip.');
      } else if (!input.sangam?.place?.trim() || !input.sangam.at) {
        return invalid('Say where and when the Dharas meet again (the Sangam).');
      }
      const split: MockSplit = {
        id: newId('sp'),
        toliId: toli.id,
        day: input.day,
        dharas: dharas.map((d) => ({ id: newId('dh'), name: d.name.trim(), stops: d.stops ?? [], memberIds: [], ...(d.leadId ? { leadId: d.leadId } : {}) })),
        sangam: input.day === null || !input.sangam ? null : { place: input.sangam.place.trim(), at: new Date(input.sangam.at).toISOString() },
        here: [],
        status: isLeader(member.role) ? 'active' : 'proposed',
        createdBy: user.id,
        createdAt: nowIso(),
      };
      db.toliSplits.push(split);
      logEvent(toli.id, user.id, 'split-created', { day: split.day, status: split.status });
      return HttpResponse.json({ split: splitView(split, toli) }, { status: 201 });
    }),
  ),

  http.get(apiUrl('/tolis/:id/splits'), ({ request, params }) =>
    asMember(request, params.id, (_user, toli) => {
      const day = new URL(request.url).searchParams.get('day');
      const splits = db.toliSplits.filter((s) => s.toliId === toli.id && (day === null || s.day === Number(day)));
      return HttpResponse.json({ splits: splits.map((s) => splitView(s, toli)) });
    }),
  ),

  http.post(apiUrl('/tolis/:id/splits/:sid/approve'), ({ request, params }) =>
    asMember(request, params.id, (_user, toli, member) => {
      const split = findSplit(toli, params.sid);
      if (!split) return missing('That split isn’t here.');
      if (!isLeader(member.role)) return forbidden('Only the Sutradhar and Sah-Sutradhars can do that.');
      split.status = 'active';
      return HttpResponse.json({ split: splitView(split, toli) });
    }),
  ),

  http.delete(apiUrl('/tolis/:id/splits/:sid'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const split = findSplit(toli, params.sid);
      if (!split) return missing('That split isn’t here.');
      const ownProposal = split.status === 'proposed' && split.createdBy === user.id;
      if (!ownProposal && !isLeader(member.role)) return forbidden('Only leaders can remove a split.');
      db.toliSplits = db.toliSplits.filter((s) => s !== split);
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  ...(['join', 'leave'] as const).map((action) =>
    http.post(apiUrl(`/tolis/:id/splits/:sid/dharas/:did/${action}`), ({ request, params }) =>
      asMember(request, params.id, (user, toli) => {
        const split = findSplit(toli, params.sid);
        const dhara = split?.dharas.find((d) => d.id === params.did);
        if (!split || !dhara) return missing('That Dhara isn’t here.');
        for (const d of split.dharas) d.memberIds = d.memberIds.filter((id) => id !== user.id);
        if (action === 'join') dhara.memberIds.push(user.id);
        return HttpResponse.json({ split: splitView(split, toli) });
      }),
    ),
  ),

  http.post(apiUrl('/tolis/:id/splits/:sid/here'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      const split = findSplit(toli, params.sid);
      if (!split) return missing('That split isn’t here.');
      if (!split.here.includes(user.id)) {
        split.here.push(user.id);
        logEvent(toli.id, user.id, 'sangam-here', { day: split.day });
      }
      return HttpResponse.json({ split: splitView(split, toli) });
    }),
  ),
  http.delete(apiUrl('/tolis/:id/splits/:sid/here'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      const split = findSplit(toli, params.sid);
      if (!split) return missing('That split isn’t here.');
      split.here = split.here.filter((id) => id !== user.id);
      return HttpResponse.json({ split: splitView(split, toli) });
    }),
  ),

  // ── Where are my Sahyatris ──
  http.put(apiUrl('/tolis/:id/location'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      const input = (await request.json()) as { lat: unknown; lon: unknown; accuracy?: number; for?: ShareFor };
      if (!isValidPosition(input.lat, input.lon)) return invalid('That isn’t a real position.');
      if (input.for !== undefined && !['1h', 'sangam', 'trip'].includes(input.for)) return invalid('Choose for how long.');
      const now = nowIso();
      const current = db.toliLocations.find((l) => l.toliId === toli.id && l.userId === user.id && l.until > now);
      let until: string | null;
      if (input.for) {
        until = sharingUntil(input.for, now, nextSangamOf(toli), tripEndOf(toli));
        if (!until) return clash(input.for === 'sangam' ? 'There’s no Sangam coming up to share until.' : 'This Toli has no trip dates to share until.');
      } else {
        if (!current) return clash('You aren’t sharing where you are — choose for how long first.');
        until = current.until;
      }
      db.toliLocations = db.toliLocations.filter((l) => !(l.toliId === toli.id && l.userId === user.id));
      db.toliLocations.push({ toliId: toli.id, userId: user.id, lat: input.lat as number, lon: input.lon as number, at: now, until });
      return HttpResponse.json({ sharing: { until } });
    }),
  ),

  http.delete(apiUrl('/tolis/:id/location'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      db.toliLocations = db.toliLocations.filter((l) => !(l.toliId === toli.id && l.userId === user.id));
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.get(apiUrl('/tolis/:id/locations'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      const now = nowIso();
      const memberIds = toli.members.map((m) => m.userId);
      const points = db.toliLocations.filter((l) => l.toliId === toli.id && memberIds.includes(l.userId) && l.until > now);
      const mine = points.find((p) => p.userId === user.id);
      return HttpResponse.json({
        me: mine ? { until: mine.until } : null,
        locations: points.filter((p) => p.userId !== user.id).map((p) => ({ person: personOf(p.userId), near: nearby(p.lat, p.lon), at: p.at, until: p.until, mapsLink: mapsLink(p.lat, p.lon) })),
      });
    }),
  ),

  // ── Notes ──
  http.get(apiUrl('/tolis/:id/notes'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const notes = db.toliNotes.filter((n) => n.toliId === toli.id).sort((a, b) => (a.day ?? 0) - (b.day ?? 0) || a.createdAt.localeCompare(b.createdAt));
      return HttpResponse.json({ notes: notes.map((n) => noteView(n, user.id, isLeader(member.role))) });
    }),
  ),

  http.post(apiUrl('/tolis/:id/notes'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const { text = '', day = null } = (await request.json()) as { text?: string; day?: number | null };
      if (!text.trim() || text.trim().length > 500) return invalid('Write a note (under 500 characters).');
      const note: MockNote = { id: newId('nt'), toliId: toli.id, authorId: user.id, day: day ?? null, text: text.trim(), createdAt: nowIso(), updatedAt: nowIso() };
      db.toliNotes.push(note);
      return HttpResponse.json({ note: noteView(note, user.id, isLeader(member.role)) }, { status: 201 });
    }),
  ),

  http.patch(apiUrl('/tolis/:id/notes/:nid'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const note = db.toliNotes.find((n) => n.id === params.nid && n.toliId === toli.id);
      if (!note) return missing('That note isn’t here.');
      if (!isLeader(member.role) && note.authorId !== user.id) return forbidden('Only whoever wrote it, or a leader, can change a note.');
      const { text = '' } = (await request.json()) as { text?: string };
      if (!text.trim() || text.trim().length > 500) return invalid('Write a note (under 500 characters).');
      note.text = text.trim();
      note.updatedAt = nowIso();
      return HttpResponse.json({ note: noteView(note, user.id, isLeader(member.role)) });
    }),
  ),

  http.delete(apiUrl('/tolis/:id/notes/:nid'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const note = db.toliNotes.find((n) => n.id === params.nid && n.toliId === toli.id);
      if (!note) return missing('That note isn’t here.');
      if (!isLeader(member.role) && note.authorId !== user.id) return forbidden('Only whoever wrote it, or a leader, can change a note.');
      db.toliNotes = db.toliNotes.filter((n) => n !== note);
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // ── Potli ──
  http.get(apiUrl('/tolis/:id/potli'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const leads = isLeader(member.role);
      const items = db.potliItems.filter((i) => i.toliId === toli.id);
      return HttpResponse.json({
        group: items.filter((i) => !i.mine).map((i) => itemView(i, user.id, leads)),
        mine: items.filter((i) => i.mine && i.addedBy === user.id).map((i) => itemView(i, user.id, leads)),
      });
    }),
  ),

  http.post(apiUrl('/tolis/:id/potli'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const { text = '', mine = false } = (await request.json()) as { text?: string; mine?: boolean };
      if (!text.trim() || text.trim().length > 80) return invalid('Say what to pack (under 80 characters).');
      const item: MockPotliItem = { id: newId('po'), toliId: toli.id, addedBy: user.id, text: text.trim(), mine, claimedBy: null, packed: false, createdAt: nowIso() };
      db.potliItems.push(item);
      return HttpResponse.json({ item: itemView(item, user.id, isLeader(member.role)) }, { status: 201 });
    }),
  ),

  http.post(apiUrl('/tolis/:id/potli/:pid/claim'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const item = findItem(toli, params.pid, user.id);
      if (!item) return missing('That item isn’t here.');
      if (item.mine) return clash('That’s on your own list already.');
      if (item.claimedBy && item.claimedBy !== user.id) return clash('Someone is already bringing that.');
      item.claimedBy = user.id;
      return HttpResponse.json({ item: itemView(item, user.id, isLeader(member.role)) });
    }),
  ),

  http.delete(apiUrl('/tolis/:id/potli/:pid/claim'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const item = findItem(toli, params.pid, user.id);
      if (!item) return missing('That item isn’t here.');
      if (item.claimedBy !== user.id) return forbidden('Only whoever is bringing it can let it go.');
      item.claimedBy = null;
      item.packed = false;
      return HttpResponse.json({ item: itemView(item, user.id, isLeader(member.role)) });
    }),
  ),

  http.patch(apiUrl('/tolis/:id/potli/:pid'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const item = findItem(toli, params.pid, user.id);
      if (!item) return missing('That item isn’t here.');
      if (!(item.mine ? item.addedBy === user.id : item.claimedBy === user.id)) return forbidden('Only whoever is bringing it can tick it packed.');
      item.packed = !!((await request.json()) as { packed?: boolean }).packed;
      return HttpResponse.json({ item: itemView(item, user.id, isLeader(member.role)) });
    }),
  ),

  http.delete(apiUrl('/tolis/:id/potli/:pid'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const item = findItem(toli, params.pid, user.id);
      if (!item) return missing('That item isn’t here.');
      if (item.addedBy !== user.id && !(isLeader(member.role) && !item.mine)) return forbidden('Only whoever added it, or a leader, can remove it.');
      db.potliItems = db.potliItems.filter((i) => i !== item);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];
