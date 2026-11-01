/**
 * toliActivity.test.ts — a Toli's activity feed: what happened, newest first, with who did
 * it; 30 at a time (older pages with `before`); outsiders get 404.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { ToliActivity } from '../src/db/models/index.js';
import { signAccess } from '../src/services/tokens.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { plannerChain, tripRequest } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** The clock: each step a minute later, so events have an order. */
let now = new Date('2026-10-18T10:00:00Z');
const tick = () => (now = new Date(now.getTime() + 60_000));
const app = createApp({ ai: plannerChain(), now: () => now, appUrl: 'https://tripwise.test' });

/** A request as someone (a login made at the current clock time). */
const as = (user: { id: string }) => {
  const auth = `Bearer ${signAccess({ id: user.id, role: 'user' }, now)}`;
  return {
    get: (path: string) => request(app).get(`/api${path}`).set('Authorization', auth),
    post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', auth).send(body),
  };
};

describe('activity', () => {
  it('lists what happened, newest first, with who did it', async () => {
    now = new Date('2026-10-18T10:00:00Z');
    await seedDestinations();
    const asha = await quickUser('Asha');
    const rohan = await quickUser('Rohan');
    const toli = (await as(asha).post('/tolis', { name: 'Feed Toli', type: 'friends' })).body.toli;
    tick();
    await as(rohan).post(`/toli-invites/${(toli.inviteUrl as string).split('/').pop()}/join`);
    tick();
    await as(asha).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: toli.id });
    tick();
    const sid = (await as(rohan).post(`/tolis/${toli.id}/sujhavs`, { change: { kind: 'add-day', theme: 'Rest' } })).body.sujhav.id;
    tick();
    await as(asha).post(`/tolis/${toli.id}/sujhavs/${sid}/approve`);
    tick();
    const poll = (await as(rohan).post(`/tolis/${toli.id}/polls`, { kind: 'transport', options: [{ mode: 'train' }, { mode: 'bus' }] })).body.poll;
    tick();
    await as(asha).post(`/tolis/${toli.id}/polls/${poll.id}/close`, { winner: poll.options[0].id });

    const feed = (await as(rohan).get(`/tolis/${toli.id}/activity`)).body.activity;
    expect(feed.map((a: { type: string; actor: { name: string } }) => `${a.actor.name} ${a.type}`)).toEqual([
      'Asha poll-closed',
      'Rohan poll-created',
      'Asha approved',
      'Rohan suggested',
      'Asha planned',
      'Rohan joined',
      'Asha created',
    ]);
    expect(feed[0].data).toMatchObject({ winner: 'Train' });
  });

  it('pages 30 at a time and keeps outsiders out', async () => {
    now = new Date('2026-10-18T10:00:00Z');
    const asha = await quickUser('Asha');
    const toli = (await as(asha).post('/tolis', { name: 'Busy Toli', type: 'friends' })).body.toli;
    await ToliActivity.insertMany(Array.from({ length: 40 }, (_, i) => ({ toliId: toli.id, actorId: asha.id, type: 'role', data: { i }, at: new Date(now.getTime() + (i + 1) * 1000) })));
    const first = (await as(asha).get(`/tolis/${toli.id}/activity`)).body.activity;
    expect(first).toHaveLength(30);
    const older = (await as(asha).get(`/tolis/${toli.id}/activity?before=${encodeURIComponent(first[29].at)}`)).body.activity;
    expect(older).toHaveLength(11);
    const dev = await quickUser('Dev');
    expect((await as(dev).get(`/tolis/${toli.id}/activity`)).status).toBe(404);
  });
});
