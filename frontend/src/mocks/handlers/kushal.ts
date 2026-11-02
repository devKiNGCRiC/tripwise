/**
 * kushal.ts (mock) — Kushal, the family check-in, for demo mode: my contacts (each with a
 * private link), automatic check-ins on or off, checking in, and the family's public page —
 * which shows only the first name and the latest check-in, rounded to about 1 km. Same routes,
 * shapes and codes as the API; position rules from `@yatra-rules`.
 */
import { http, HttpResponse } from 'msw';
import { isValidPosition, mapsLink, nearestPlace, roundPosition } from '@yatra-rules';
import { apiUrl } from '@/lib/api/config';
import { seedPlaces } from '../data/destinations';
import { db } from '../db';
import { currentUser, errorResponse, latency } from './shared';

/** Most family contacts per traveller. */
const MAX_CONTACTS = 5;
/** How near a catalogue place must be to name it (km). */
const NEAR_KM = 50;
/** A link's secret (24 characters). */
const newToken = () => `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 24).padEnd(24, 'x');
/** The family's link for a token. */
const linkFor = (token: string) => `${window.location.origin}/kushal/${token}`;
/** Small unique ids. */
let counter = 0;
const newId = () => `ku_${Date.now().toString(36)}${(counter++).toString(36)}`;
/** 401 for a missing login. */
const needLogin = () => errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');

/** My contacts as I see them. */
const contactView = (c: (typeof db.kushal.contacts)[number]) => ({ id: c.id, name: c.name, link: linkFor(c.token), createdAt: c.createdAt });

export const kushalHandlers = [
  http.get(apiUrl('/me/kushal'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const latest = db.kushal.checkIns[user.id];
    return HttpResponse.json({
      contacts: db.kushal.contacts.filter((c) => c.userId === user.id).map(contactView),
      auto: !!db.kushal.auto[user.id],
      latest: latest ? { place: latest.place, at: latest.at, ...(latest.note ? { note: latest.note } : {}) } : null,
    });
  }),

  http.post(apiUrl('/me/kushal/contacts'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const name = (((await request.json()) as { name?: string }).name ?? '').trim();
    if (!name || name.length > 40) return errorResponse(400, 'VALIDATION', 'Give their name.');
    if (db.kushal.contacts.filter((c) => c.userId === user.id).length >= MAX_CONTACTS) return errorResponse(409, 'CONFLICT', `Up to ${MAX_CONTACTS} family contacts.`);
    const contact = { id: newId(), userId: user.id, name, token: newToken(), createdAt: new Date().toISOString() };
    db.kushal.contacts.push(contact);
    return HttpResponse.json({ contact: contactView(contact) }, { status: 201 });
  }),

  http.delete(apiUrl('/me/kushal/contacts/:cid'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const contact = db.kushal.contacts.find((c) => c.id === params.cid && c.userId === user.id);
    if (!contact) return errorResponse(404, 'NOT_FOUND', 'That contact isn’t here.');
    db.kushal.contacts = db.kushal.contacts.filter((c) => c !== contact);
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(apiUrl('/me/kushal'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const auto = !!((await request.json()) as { auto?: boolean }).auto;
    db.kushal.auto[user.id] = auto;
    return HttpResponse.json({ auto });
  }),

  http.post(apiUrl('/me/kushal/checkin'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const input = (await request.json()) as { lat?: number; lon?: number; note?: string };
    const hasPosition = input.lat !== undefined || input.lon !== undefined;
    if (hasPosition && !isValidPosition(input.lat, input.lon)) return errorResponse(400, 'VALIDATION', 'That isn’t a real position.');
    const note = input.note?.trim();
    if (note && note.length > 140) return errorResponse(400, 'VALIDATION', 'Keep the note under 140 characters.');
    const near = hasPosition ? nearestPlace(input.lat!, input.lon!, seedPlaces) : null;
    const place = !hasPosition ? 'Place not shared' : near && near.km <= NEAR_KM ? `near ${near.name}` : 'Somewhere without a nearby landmark';
    const at = new Date().toISOString();
    // Only the latest is kept, with the position rounded to about 1 km.
    db.kushal.checkIns[user.id] = { place, at, ...(hasPosition ? roundPosition(input.lat!, input.lon!) : {}), ...(note ? { note } : {}) };
    return HttpResponse.json({ latest: { place, at, ...(note ? { note } : {}) } });
  }),

  http.get(apiUrl('/kushal/:token'), async ({ params }) => {
    await latency();
    const contact = db.kushal.contacts.find((c) => c.token === params.token);
    const user = contact ? db.users.find((u) => u.id === contact.userId) : undefined;
    if (!contact || !user) return errorResponse(404, 'NOT_FOUND', 'This Kushal link isn’t active.');
    const c = db.kushal.checkIns[user.id];
    const has = c && typeof c.lat === 'number' && typeof c.lon === 'number';
    return HttpResponse.json({
      kushal: {
        traveller: user.name.split(' ')[0],
        latest: c ? { place: c.place, at: c.at, ...(c.note ? { note: c.note } : {}), ...(has ? { position: { lat: c.lat!, lon: c.lon! }, mapsLink: mapsLink(c.lat!, c.lon!) } : {}) } : null,
      },
    });
  }),
];
