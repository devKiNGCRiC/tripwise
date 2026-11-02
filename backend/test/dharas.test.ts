/**
 * dharas.test.ts — splitting a day into Dharas that meet again at a Sangam:
 *   - a leader splits a day; a Sahyatri's split waits for a leader's approval
 *   - joining a Dhara leaves any other in the same split
 *   - "I'm here" at the Sangam, and the headcount (members only)
 *   - fixed Dharas for the whole trip (college / office Tolis only, each with a lead)
 *   - only leaders delete an active split; outsiders get 404
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
  del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${token}`),
});

/** Asha's Toli (of a kind) with Rohan and Priya. */
async function setup(type = 'friends') {
  const asha = await quickUser('Asha', NOW);
  const rohan = await quickUser('Rohan', NOW);
  const priya = await quickUser('Priya', NOW);
  const created = (await as(asha.token).post('/tolis', { name: 'Day Toli', type })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p.token).post(`/toli-invites/${token}/join`);
  return { asha, rohan, priya, id: created.id as string };
}

/** Day 2: Beach and Fort, meeting at the boat jetty at 5 pm (IST). */
const daySplit = { day: 2, dharas: [{ name: 'Beach', stops: ['Cherai beach'] }, { name: 'Fort' }], sangam: { place: 'Boat jetty', at: '2026-11-03T11:30:00.000Z' } };

describe('Dharas and Sangam', () => {
  it('lets a leader split a day, and Sahyatris move between Dharas', async () => {
    const { asha, rohan, id } = await setup();
    const created = await as(asha.token).post(`/tolis/${id}/splits`, daySplit);
    expect(created.status).toBe(201);
    const split = created.body.split;
    expect(split).toMatchObject({ day: 2, status: 'active', sangam: { place: 'Boat jetty', at: '2026-11-03T11:30:00.000Z' } });
    const [beach, fort] = split.dharas;
    expect(beach).toMatchObject({ name: 'Beach', stops: ['Cherai beach'], members: [] });
    await as(rohan.token).post(`/tolis/${id}/splits/${split.id}/dharas/${beach.id}/join`);
    const moved = (await as(rohan.token).post(`/tolis/${id}/splits/${split.id}/dharas/${fort.id}/join`)).body.split;
    expect(moved.dharas.map((d: { members: { id: string }[] }) => d.members.map((m) => m.id))).toEqual([[], [rohan.id]]);
    const left = (await as(rohan.token).post(`/tolis/${id}/splits/${split.id}/dharas/${fort.id}/leave`)).body.split;
    expect(left.dharas[1].members).toEqual([]);
  });

  it('counts who is here at the Sangam', async () => {
    const { asha, rohan, priya, id } = await setup();
    const split = (await as(asha.token).post(`/tolis/${id}/splits`, daySplit)).body.split;
    const after = (await as(rohan.token).post(`/tolis/${id}/splits/${split.id}/here`)).body.split;
    expect(after.headcount.here.map((p: { id: string }) => p.id)).toEqual([rohan.id]);
    expect(after.headcount.missing.map((p: { id: string }) => p.id)).toEqual([asha.id, priya.id]);
    // Saying it twice changes nothing; taking it back does.
    await as(rohan.token).post(`/tolis/${id}/splits/${split.id}/here`);
    const back = (await as(rohan.token).del(`/tolis/${id}/splits/${split.id}/here`)).body.split;
    expect(back.headcount.here).toEqual([]);
    const events = (await as(asha.token).get(`/tolis/${id}/activity`)).body.activity.filter((e: { type: string }) => e.type === 'sangam-here');
    expect(events).toHaveLength(1);
  });

  it('lists a day’s splits', async () => {
    const { asha, id } = await setup();
    await as(asha.token).post(`/tolis/${id}/splits`, daySplit);
    await as(asha.token).post(`/tolis/${id}/splits`, { ...daySplit, day: 3 });
    expect((await as(asha.token).get(`/tolis/${id}/splits?day=2`)).body.splits).toHaveLength(1);
    expect((await as(asha.token).get(`/tolis/${id}/splits`)).body.splits).toHaveLength(2);
  });

  it('keeps a Sahyatri’s split waiting for a leader', async () => {
    const { asha, priya, id } = await setup();
    const proposed = (await as(priya.token).post(`/tolis/${id}/splits`, daySplit)).body.split;
    expect(proposed.status).toBe('proposed');
    expect((await as(priya.token).post(`/tolis/${id}/splits/${proposed.id}/approve`)).status).toBe(403);
    expect((await as(asha.token).post(`/tolis/${id}/splits/${proposed.id}/approve`)).body.split.status).toBe('active');
  });

  it('lets only leaders delete an active split (the proposer may withdraw a proposed one)', async () => {
    const { asha, priya, id } = await setup();
    const active = (await as(asha.token).post(`/tolis/${id}/splits`, daySplit)).body.split;
    expect((await as(priya.token).del(`/tolis/${id}/splits/${active.id}`)).status).toBe(403);
    expect((await as(asha.token).del(`/tolis/${id}/splits/${active.id}`)).status).toBe(204);
    const mine = (await as(priya.token).post(`/tolis/${id}/splits`, daySplit)).body.split;
    expect((await as(priya.token).del(`/tolis/${id}/splits/${mine.id}`)).status).toBe(204);
  });

  it('refuses a day split without a Sangam, and bad Dharas', async () => {
    const { asha, id } = await setup();
    const bad = [
      { day: 2, dharas: daySplit.dharas },
      { ...daySplit, dharas: [{ name: 'Only one' }] },
      { ...daySplit, dharas: [{ name: '' }, { name: 'Fort' }] },
      { ...daySplit, sangam: { place: '', at: daySplit.sangam.at } },
      { ...daySplit, day: 0 },
    ];
    for (const body of bad) expect((await as(asha.token).post(`/tolis/${id}/splits`, body)).status).toBe(400);
  });
});

describe('fixed Dharas', () => {
  it('are for college and office Tolis, each with a lead', async () => {
    const friends = await setup();
    expect((await as(friends.asha.token).post(`/tolis/${friends.id}/splits`, { day: null, dharas: [{ name: 'Bus 1' }, { name: 'Bus 2' }] })).status).toBe(400);
    await clearTestDb();
    const office = await setup('office');
    const res = await as(office.asha.token).post(`/tolis/${office.id}/splits`, { day: null, dharas: [{ name: 'Bus 1', leadId: office.rohan.id }, { name: 'Bus 2' }] });
    expect(res.status).toBe(201);
    expect(res.body.split).toMatchObject({ day: null, sangam: null });
    expect(res.body.split.dharas[0].lead.id).toBe(office.rohan.id);
    // A lead must be in the Toli.
    const stranger = await quickUser('Kiran', NOW);
    expect((await as(office.asha.token).post(`/tolis/${office.id}/splits`, { day: null, dharas: [{ name: 'Bus 1', leadId: stranger.id }, { name: 'Bus 2' }] })).status).toBe(400);
  });
});

describe('outsiders', () => {
  it('get 404', async () => {
    const { asha, id } = await setup();
    const split = (await as(asha.token).post(`/tolis/${id}/splits`, daySplit)).body.split;
    const stranger = await quickUser('Kiran', NOW);
    expect((await as(stranger.token).get(`/tolis/${id}/splits`)).status).toBe(404);
    expect((await as(stranger.token).post(`/tolis/${id}/splits/${split.id}/here`)).status).toBe(404);
    expect((await as(stranger.token).post(`/tolis/${id}/splits/${split.id}/dharas/${split.dharas[0].id}/join`)).status).toBe(404);
  });
});
