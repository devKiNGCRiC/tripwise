/**
 * sujhav.test.ts — suggestions on the Sahyatra:
 *   - any Sahyatri suggests a change (with a note); everyone votes 👍/👎 and can change or clear a vote
 *   - only leaders approve (the change lands in the plan) or decline (the plan stays)
 *   - a suggestion about a plan that changed since is refused (409) and the plan is untouched
 *   - closed suggestions take no more votes; outsiders get 404; no Sahyatra yet → 409
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { Itinerary, ToliActivity } from '../src/db/models/index.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { plannerChain, tripRequest } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-10-18T10:00:00Z');
const app = createApp({ ai: plannerChain(), now: () => NOW, appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  put: (path: string, body: object) => request(app).put(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

/** A Toli (Asha leads, Kabir and Zoya joined) with a planned Sahyatra; returns its first day's stops. */
async function setup({ plan = true } = {}) {
  await seedDestinations();
  const asha = await quickUser('Asha');
  const kabir = await quickUser('Kabir');
  const zoya = await quickUser('Zoya');
  const created = (await as(asha.token).post('/tolis', { name: 'Hampi Toli', type: 'friends' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [kabir, zoya]) await as(p.token).post(`/toli-invites/${token}/join`);
  const trip = plan ? (await as(asha.token).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: created.id })).body.itinerary : null;
  return { asha, kabir, zoya, id: created.id as string, trip };
}

/** A new stop to suggest. */
const STOP = { time: 'afternoon', startTime: '15:00', title: 'Coracle ride', description: 'Round boats on the Tungabhadra.' };

describe('suggesting and voting', () => {
  it('lets any Sahyatri suggest, and everyone vote', async () => {
    const { asha, kabir, zoya, id } = await setup();
    const made = await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-stop', day: 1, at: 1, stop: STOP }, note: 'Must do!' });
    expect(made.status).toBe(201);
    const sid = made.body.sujhav.id;
    await as(asha.token).put(`/tolis/${id}/sujhavs/${sid}/vote`, { vote: 1 });
    await as(zoya.token).put(`/tolis/${id}/sujhavs/${sid}/vote`, { vote: -1 });
    await as(zoya.token).put(`/tolis/${id}/sujhavs/${sid}/vote`, { vote: 1 });
    const list = (await as(asha.token).get(`/tolis/${id}/sujhavs?status=open`)).body.sujhavs;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ up: 2, down: 0, myVote: 1, status: 'open', note: 'Must do!', author: { name: 'Kabir' } });
    await as(asha.token).put(`/tolis/${id}/sujhavs/${sid}/vote`, { vote: 0 });
    expect((await as(asha.token).get(`/tolis/${id}/sujhavs`)).body.sujhavs[0]).toMatchObject({ up: 1, myVote: 0 });
  });

  it('needs a Sahyatra first, and keeps outsiders out', async () => {
    const { kabir, id } = await setup({ plan: false });
    const res = await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-day', theme: 'Rest' } });
    expect(res.status).toBe(409);
    const stranger = await quickUser('Dev');
    expect((await as(stranger.token).get(`/tolis/${id}/sujhavs`)).status).toBe(404);
  });

  it('checks the suggestion', async () => {
    const { kabir, id } = await setup();
    expect((await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'teleport' } })).status).toBe(400);
    expect((await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-day', theme: 'Rest' }, note: 'x'.repeat(281) })).status).toBe(400);
  });
});

describe('deciding', () => {
  it('lets leaders approve — the change lands in the plan', async () => {
    const { asha, kabir, id, trip } = await setup();
    const sid = (await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-stop', day: 1, at: 1, stop: STOP } })).body.sujhav.id;
    expect((await as(kabir.token).post(`/tolis/${id}/sujhavs/${sid}/approve`)).status).toBe(403);
    const approved = await as(asha.token).post(`/tolis/${id}/sujhavs/${sid}/approve`);
    expect(approved.body.sujhav.status).toBe('approved');
    const saved = await Itinerary.findById(trip.id);
    expect(saved!.days[0].activities[1].title).toBe('Coracle ride');
    expect((await ToliActivity.find({ toliId: id }).lean()).map((a) => a.type)).toEqual(expect.arrayContaining(['suggested', 'approved']));
  });

  it('approves a new stop even without a description', async () => {
    const { asha, kabir, id, trip } = await setup();
    const sid = (await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-stop', day: 2, at: 0, stop: { time: 'morning', title: 'Hampi Bazaar' } } })).body.sujhav.id;
    expect((await as(asha.token).post(`/tolis/${id}/sujhavs/${sid}/approve`)).status).toBe(200);
    expect((await Itinerary.findById(trip.id))!.days[1].activities[0]).toMatchObject({ title: 'Hampi Bazaar', description: 'Suggested by the Toli.' });
  });

  it('adds a day to the end of the trip', async () => {
    const { asha, kabir, id, trip } = await setup();
    const sid = (await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-day', theme: 'Rest day' } })).body.sujhav.id;
    await as(asha.token).post(`/tolis/${id}/sujhavs/${sid}/approve`);
    const saved = await Itinerary.findById(trip.id);
    expect(saved!.days).toHaveLength(4);
    expect(saved!.request!.endDate).toBe('2026-11-13');
  });

  it('refuses a suggestion about a plan that changed since', async () => {
    const { asha, kabir, zoya, id, trip } = await setup();
    const first = trip.days[0].activities[0].title as string;
    const remove = (await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'remove-stop', day: 1, index: 0, title: first } })).body.sujhav.id;
    const swap = (await as(zoya.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'swap-stop', day: 1, index: 0, title: first, stop: STOP } })).body.sujhav.id;
    await as(asha.token).post(`/tolis/${id}/sujhavs/${remove}/approve`);
    const before = JSON.stringify((await Itinerary.findById(trip.id))!.days);
    const stale = await as(asha.token).post(`/tolis/${id}/sujhavs/${swap}/approve`);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('CONFLICT');
    expect(JSON.stringify((await Itinerary.findById(trip.id))!.days)).toBe(before);
    expect((await as(asha.token).get(`/tolis/${id}/sujhavs?status=open`)).body.sujhavs.map((s: { id: string }) => s.id)).toEqual([swap]);
  });

  it('declines with a reason, keeps the plan, and takes no more votes', async () => {
    const { asha, kabir, id, trip } = await setup();
    const sid = (await as(kabir.token).post(`/tolis/${id}/sujhavs`, { change: { kind: 'add-stop', day: 1, at: 0, stop: STOP } })).body.sujhav.id;
    const declined = await as(asha.token).post(`/tolis/${id}/sujhavs/${sid}/decline`, { reason: 'Too far that day' });
    expect(declined.body.sujhav).toMatchObject({ status: 'declined', reason: 'Too far that day', decidedBy: { name: 'Asha' } });
    expect((await Itinerary.findById(trip.id))!.days[0].activities.map((a) => a.title)).toEqual(trip.days[0].activities.map((a: { title: string }) => a.title));
    expect((await as(kabir.token).put(`/tolis/${id}/sujhavs/${sid}/vote`, { vote: 1 })).status).toBe(409);
    expect((await as(asha.token).post(`/tolis/${id}/sujhavs/${sid}/approve`)).status).toBe(409);
  });
});
