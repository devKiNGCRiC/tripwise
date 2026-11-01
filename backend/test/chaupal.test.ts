/**
 * chaupal.test.ts — the Toli's chat:
 *   - post and read messages (oldest → newest; `after` for only what's new)
 *   - replies and @mentions (members only)
 *   - the same message sent twice after an offline retry (same clientId) is stored once
 *   - announcement mode: only leaders write, unless someone was allowed one message
 *   - suggestions and polls appear as trip cards; photos only for the Toli
 *   - unread counts clear when the chat is read; outsiders get 404
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { Message, Toli } from '../src/db/models/index.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { plannerChain, tripRequest } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** The clock, movable per test. */
let now = new Date('2026-10-18T10:00:00Z');
const app = createApp({ ai: plannerChain(), now: () => now, appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

/** Asha's Toli with Kabir and Zoya. */
async function setup(type = 'friends') {
  now = new Date('2026-10-18T10:00:00Z');
  const asha = await quickUser('Asha');
  const kabir = await quickUser('Kabir');
  const zoya = await quickUser('Zoya');
  const created = (await as(asha.token).post('/tolis', { name: 'Chat Toli', type })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [kabir, zoya]) await as(p.token).post(`/toli-invites/${token}/join`);
  return { asha, kabir, zoya, id: created.id as string };
}

/** Send a message (a fresh clientId unless given). */
let counter = 0;
const send = (token: string, id: string, body: object) => as(token).post(`/tolis/${id}/messages`, { clientId: `c${++counter}-abcdef`, ...body });
/** A tiny valid PNG. */
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');

describe('talking', () => {
  it('posts and lists messages, oldest first, and only newer ones on request', async () => {
    const { asha, kabir, id } = await setup();
    await send(asha.token, id, { text: 'Train or flight?' });
    now = new Date('2026-10-18T10:01:00Z');
    const reply = await send(kabir.token, id, { text: 'Train!' });
    expect(reply.status).toBe(201);
    const all = (await as(asha.token).get(`/tolis/${id}/messages`)).body.messages;
    expect(all.map((m: { text: string }) => m.text)).toEqual(['Train or flight?', 'Train!']);
    expect(all[1].author).toMatchObject({ name: 'Kabir' });
    const newer = (await as(asha.token).get(`/tolis/${id}/messages?after=2026-10-18T10:00:30.000Z`)).body.messages;
    expect(newer.map((m: { text: string }) => m.text)).toEqual(['Train!']);
  });

  it('replies and mentions members only', async () => {
    const { asha, kabir, id } = await setup();
    const first = (await send(asha.token, id, { text: 'Who booked the homestay?' })).body.message;
    const dev = await quickUser('Dev');
    const answer = (await send(kabir.token, id, { text: `@asha I did. @${dev.username} isn't here.`, replyTo: first.id })).body.message;
    expect(answer.replyTo).toMatchObject({ id: first.id, text: 'Who booked the homestay?', authorName: 'Asha' });
    expect(answer.mentions).toEqual([asha.id]);
  });

  it('stores a message sent twice (offline retry) only once', async () => {
    const { kabir, id } = await setup();
    const body = { clientId: 'offline-retry-1', text: 'Reached Hospet!' };
    expect((await as(kabir.token).post(`/tolis/${id}/messages`, body)).status).toBe(201);
    const again = await as(kabir.token).post(`/tolis/${id}/messages`, body);
    expect(again.status).toBe(200);
    expect(await Message.countDocuments({ toliId: id, text: 'Reached Hospet!' })).toBe(1);
  });

  it('keeps outsiders out and checks the message', async () => {
    const { kabir, id } = await setup();
    const dev = await quickUser('Dev');
    expect((await as(dev.token).get(`/tolis/${id}/messages`)).status).toBe(404);
    expect((await send(dev.token, id, { text: 'hi' })).status).toBe(404);
    expect((await send(kabir.token, id, { text: '' })).status).toBe(400);
    expect((await send(kabir.token, id, { text: 'x'.repeat(2001) })).status).toBe(400);
  });
});

describe('announcement mode', () => {
  it('lets only leaders write — and someone allowed exactly one message', async () => {
    const { asha, kabir, id } = await setup('college');
    expect((await send(asha.token, id, { text: 'Buses leave at 7.' })).status).toBe(201);
    const blocked = await send(kabir.token, id, { text: 'Can we leave later?' });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.message).toBe('Announcement mode — raise your hand to ask.');
    await Toli.updateOne({ _id: id, 'members.userId': kabir.id }, { $set: { 'members.$.oneMessage': true } });
    expect((await send(kabir.token, id, { text: 'Bus 2 is ready.' })).status).toBe(201);
    expect((await send(kabir.token, id, { text: 'And another?' })).status).toBe(403);
  });
});

describe('cards and photos', () => {
  it('shows a new suggestion and poll as trip cards', async () => {
    await seedDestinations();
    const { asha, kabir, id } = await setup();
    await as(asha.token).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: id });
    await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-day', theme: 'Rest' } });
    await as(kabir.token).post(`/tolis/${id}/polls`, { kind: 'transport', options: [{ mode: 'train' }, { mode: 'bus' }] });
    const cards = (await as(asha.token).get(`/tolis/${id}/messages`)).body.messages.filter((m: { card?: unknown }) => m.card);
    expect(cards.map((m: { card: { type: string } }) => m.card.type)).toEqual(['sujhav', 'poll']);
    expect(cards[1].card.title).toBe('How shall we travel?');
  });

  it('shares photos with the Toli only', async () => {
    const { kabir, zoya, id } = await setup();
    const up = await request(app).post(`/api/tolis/${id}/messages/photos`).set('Authorization', `Bearer ${kabir.token}`).set('Content-Type', 'image/png').send(PNG);
    expect(up.status).toBe(201);
    const photoId = up.body.photo.id;
    const posted = (await send(kabir.token, id, { text: 'Sunset!', photoIds: [photoId] })).body.message;
    expect(posted.photos[0].id).toBe(photoId);
    // Zoya (a member) can open it; a stranger can't.
    const zoyaUrl = (await as(zoya.token).get(`/tolis/${id}/messages`)).body.messages[0].photos[0].url;
    expect((await request(app).get(zoyaUrl)).status).toBe(200);
    const dev = await quickUser('Dev');
    expect((await request(app).get(`/api/photos/${photoId}`).set('Authorization', `Bearer ${dev.token}`)).status).toBe(404);
    // Only your own uploads can go in your message.
    expect((await send(zoya.token, id, { text: 'Mine?', photoIds: [photoId] })).status).toBe(400);
  });
});

describe('unread', () => {
  it('counts messages from others until the chat is read', async () => {
    const { asha, kabir, id } = await setup();
    // A minute after everyone joined.
    now = new Date('2026-10-18T10:01:00Z');
    await send(kabir.token, id, { text: 'One' });
    await send(kabir.token, id, { text: 'Two' });
    await send(asha.token, id, { text: 'Mine' });
    const unread = () => as(asha.token).get('/tolis').then((r) => r.body.tolis[0].unread);
    expect(await unread()).toBe(2);
    now = new Date('2026-10-18T10:05:00Z');
    await as(asha.token).post(`/tolis/${id}/read`);
    expect(await unread()).toBe(0);
  });
});
