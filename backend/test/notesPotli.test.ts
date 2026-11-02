/**
 * notesPotli.test.ts — a Toli's shared notes and its Potli (packing list):
 *   - notes for the whole trip or a day (trip-wide first); only the author or leaders edit them
 *   - group items someone claims ("I'll bring it"), one claimer at a time; only the claimer
 *     ticks it packed; my own list is never shown to anyone else
 *   - outsiders get 404
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-11-02T10:00:00Z');
const app = createApp({ ai: fakeChain(), now: () => NOW, appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${token}`),
});

/** Asha's Toli with Rohan and Priya. */
async function setup() {
  const asha = await quickUser('Asha', NOW);
  const rohan = await quickUser('Rohan', NOW);
  const priya = await quickUser('Priya', NOW);
  const created = (await as(asha.token).post('/tolis', { name: 'Notes Toli', type: 'friends' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p.token).post(`/toli-invites/${token}/join`);
  return { asha, rohan, priya, id: created.id as string };
}

describe('notes', () => {
  it('keeps trip-wide notes first, then by day', async () => {
    const { asha, priya, id } = await setup();
    await as(priya.token).post(`/tolis/${id}/notes`, { text: 'Carry sunscreen', day: 2 });
    const trip = await as(asha.token).post(`/tolis/${id}/notes`, { text: 'Homestay owner: Ramesh' });
    expect(trip.status).toBe(201);
    expect(trip.body.note).toMatchObject({ text: 'Homestay owner: Ramesh', day: null, author: { id: asha.id }, canEdit: true });
    const notes = (await as(priya.token).get(`/tolis/${id}/notes`)).body.notes;
    expect(notes.map((n: { text: string }) => n.text)).toEqual(['Homestay owner: Ramesh', 'Carry sunscreen']);
    expect(notes.map((n: { canEdit: boolean }) => n.canEdit)).toEqual([false, true]);
  });

  it('lets only the author or a leader change a note', async () => {
    const { asha, priya, id } = await setup();
    const note = (await as(asha.token).post(`/tolis/${id}/notes`, { text: 'Permits at the gate' })).body.note;
    expect((await as(priya.token).patch(`/tolis/${id}/notes/${note.id}`, { text: 'Changed' })).status).toBe(403);
    const mine = (await as(priya.token).post(`/tolis/${id}/notes`, { text: 'Bring a torch', day: 1 })).body.note;
    expect((await as(asha.token).patch(`/tolis/${id}/notes/${mine.id}`, { text: 'Bring two torches' })).body.note.text).toBe('Bring two torches');
    expect((await as(priya.token).del(`/tolis/${id}/notes/${note.id}`)).status).toBe(403);
    expect((await as(priya.token).del(`/tolis/${id}/notes/${mine.id}`)).status).toBe(204);
  });

  it('refuses empty or very long notes', async () => {
    const { asha, id } = await setup();
    for (const text of ['', ' ', 'x'.repeat(501)]) expect((await as(asha.token).post(`/tolis/${id}/notes`, { text })).status).toBe(400);
  });
});

describe('Potli', () => {
  it('lets one Sahyatri claim a group item, and only them tick it packed', async () => {
    const { asha, rohan, priya, id } = await setup();
    const speaker = (await as(asha.token).post(`/tolis/${id}/potli`, { text: 'Speaker' })).body.item;
    expect(speaker).toMatchObject({ text: 'Speaker', claimedBy: null, packed: false, mine: false });
    expect((await as(rohan.token).post(`/tolis/${id}/potli/${speaker.id}/claim`)).body.item.claimedBy.id).toBe(rohan.id);
    expect((await as(priya.token).post(`/tolis/${id}/potli/${speaker.id}/claim`)).status).toBe(409);
    expect((await as(priya.token).patch(`/tolis/${id}/potli/${speaker.id}`, { packed: true })).status).toBe(403);
    expect((await as(rohan.token).patch(`/tolis/${id}/potli/${speaker.id}`, { packed: true })).body.item.packed).toBe(true);
    expect((await as(rohan.token).del(`/tolis/${id}/potli/${speaker.id}/claim`)).body.item).toMatchObject({ claimedBy: null, packed: false });
    expect((await as(priya.token).post(`/tolis/${id}/potli/${speaker.id}/claim`)).status).toBe(200);
  });

  it('keeps my own list to myself', async () => {
    const { asha, priya, id } = await setup();
    await as(asha.token).post(`/tolis/${id}/potli`, { text: 'First-aid kit' });
    const mine = (await as(priya.token).post(`/tolis/${id}/potli`, { text: 'Inhaler', mine: true })).body.item;
    expect(mine).toMatchObject({ mine: true, packed: false });
    const priyas = (await as(priya.token).get(`/tolis/${id}/potli`)).body;
    expect(priyas.group.map((i: { text: string }) => i.text)).toEqual(['First-aid kit']);
    expect(priyas.mine.map((i: { text: string }) => i.text)).toEqual(['Inhaler']);
    expect((await as(priya.token).patch(`/tolis/${id}/potli/${mine.id}`, { packed: true })).body.item.packed).toBe(true);
    const ashas = await as(asha.token).get(`/tolis/${id}/potli`);
    expect(JSON.stringify(ashas.body)).not.toContain('Inhaler');
    // Nobody else can touch it (it doesn't exist for them).
    expect((await as(asha.token).del(`/tolis/${id}/potli/${mine.id}`)).status).toBe(404);
    expect((await as(asha.token).post(`/tolis/${id}/potli/${mine.id}/claim`)).status).toBe(404);
  });

  it('lets whoever added a group item, or leaders, remove it', async () => {
    const { asha, rohan, priya, id } = await setup();
    const torch = (await as(rohan.token).post(`/tolis/${id}/potli`, { text: 'Torch' })).body.item;
    expect((await as(priya.token).del(`/tolis/${id}/potli/${torch.id}`)).status).toBe(403);
    expect((await as(asha.token).del(`/tolis/${id}/potli/${torch.id}`)).status).toBe(204);
  });
});

describe('outsiders', () => {
  it('get 404', async () => {
    const { id } = await setup();
    const stranger = await quickUser('Kiran', NOW);
    expect((await as(stranger.token).get(`/tolis/${id}/notes`)).status).toBe(404);
    expect((await as(stranger.token).get(`/tolis/${id}/potli`)).status).toBe(404);
    expect((await as(stranger.token).post(`/tolis/${id}/potli`, { text: 'x' })).status).toBe(404);
  });
});
