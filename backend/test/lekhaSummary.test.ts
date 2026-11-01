/**
 * lekhaSummary.test.ts — a Toli's Lekha summary and settling up (amounts in paise):
 *   - balances add up to 0, and the fewest payments clear them
 *   - a payee who saved a UPI ID gets a Pay-with-UPI link on payments to them
 *   - recording a settlement clears it (offline-safe; never deleted); bad ones are refused
 *   - totals count group expenses; my personal spending appears only in my own summary
 *   - TripWise's estimate comes from the Sahyatra; outsiders get 404
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { Itinerary } from '../src/db/models/index.js';
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
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

/** Asha's Toli with Rohan and Priya; Rohan pays ₹900 for Rohan+Priya, Priya ₹300 for all three. */
async function setup() {
  const asha = await quickUser('Asha');
  const rohan = await quickUser('Rohan');
  const priya = await quickUser('Priya');
  const created = (await as(asha.token).post('/tolis', { name: 'Money Toli', type: 'friends' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p.token).post(`/toli-invites/${token}/join`);
  const id = created.id as string;
  const add = (who: { token: string }, body: object) => as(who.token).post(`/tolis/${id}/expenses`, { clientId: `c-${Math.random()}`, category: 'food', method: 'cash', ...body });
  await add(rohan, { title: 'Thali dinner', amount: 90000, split: { kind: 'equal', among: [rohan.id, priya.id] } });
  await add(priya, { title: 'Auto to the jetty', amount: 30000, category: 'transport' });
  return { asha, rohan, priya, id };
}

/** The summary as someone. */
const lekha = async (who: { token: string }, id: string) => (await as(who.token).get(`/tolis/${id}/lekha`)).body.lekha;

describe('balances and settling up', () => {
  it('nets everyone to a sum of 0 and finds the fewest payments', async () => {
    const { asha, rohan, priya, id } = await setup();
    const summary = await lekha(asha, id);
    const net = Object.fromEntries(summary.balances.map((b: { person: { id: string }; net: number }) => [b.person.id, b.net]));
    expect(net).toEqual({ [rohan.id]: 35000, [priya.id]: -25000, [asha.id]: -10000 });
    // Largest owed first.
    expect(summary.balances[0].person.id).toBe(rohan.id);
    expect(summary.settleUp.map((p: { from: { id: string }; to: { id: string }; amount: number }) => [p.from.id, p.to.id, p.amount])).toEqual([
      [priya.id, rohan.id, 25000],
      [asha.id, rohan.id, 10000],
    ]);
    expect(summary.settleUp[0].upiLink).toBeUndefined();
  });

  it('adds a Pay-with-UPI link when the payee saved a UPI ID', async () => {
    const { asha, rohan, id } = await setup();
    await as(rohan.token).patch(`/tolis/${id}/me`, { upi: 'rohan@okicici' });
    const pay = (await lekha(asha, id)).settleUp[0];
    expect(pay.upiLink).toBe('upi://pay?pa=rohan%40okicici&pn=Rohan&am=250.00&cu=INR&tn=Money%20Toli%20%C2%B7%20TripWise');
  });

  it('records a settlement once, keeps it, and clears the payment', async () => {
    const { asha, rohan, priya, id } = await setup();
    const body = { clientId: 'phone-9', from: priya.id, to: rohan.id, amount: 25000, method: 'upi' };
    const first = await as(asha.token).post(`/tolis/${id}/settlements`, body);
    expect(first.status).toBe(201);
    expect(first.body.settlement).toMatchObject({ from: { id: priya.id }, to: { id: rohan.id }, amount: 25000, method: 'upi', recordedBy: { id: asha.id } });
    expect((await as(asha.token).post(`/tolis/${id}/settlements`, body)).status).toBe(200);
    const summary = await lekha(priya, id);
    expect(summary.settlements).toHaveLength(1);
    expect(summary.settleUp.map((p: { from: { id: string } }) => p.from.id)).toEqual([asha.id]);
    expect(summary.balances.find((b: { person: { id: string } }) => b.person.id === priya.id).net).toBe(0);
    // Activity says who paid whom.
    const events = (await as(rohan.token).get(`/tolis/${id}/activity`)).body.activity;
    expect(events.some((e: { type: string; data: { amount: number } }) => e.type === 'settled' && e.data.amount === 25000)).toBe(true);
  });

  it('refuses paying yourself, outsiders and silly amounts', async () => {
    const { asha, rohan, id } = await setup();
    const stranger = await quickUser('Kiran');
    const bad = [
      { from: rohan.id, to: rohan.id, amount: 100 },
      { from: rohan.id, to: stranger.id, amount: 100 },
      { from: rohan.id, to: asha.id, amount: 0 },
      { from: rohan.id, to: asha.id, amount: 1.5 },
    ];
    for (const b of bad) expect((await as(asha.token).post(`/tolis/${id}/settlements`, { clientId: `x-${Math.random()}`, method: 'cash', ...b })).status).toBe(400);
  });
});

describe('totals', () => {
  it('counts group expenses for everyone; personal spending only in my own summary', async () => {
    const { asha, priya, id } = await setup();
    // ₹217 — a number that appears nowhere else in the Lekha.
    await as(asha.token).post(`/tolis/${id}/expenses`, { clientId: 'p1', title: 'Banana chips', amount: 21700, category: 'shopping', method: 'cash', personal: true });
    const mine = (await lekha(asha, id)).totals;
    expect(mine.total).toBe(120000);
    expect(mine.byCategory).toEqual({ stay: 0, food: 90000, transport: 30000, tickets: 0, shopping: 0, other: 0 });
    expect(mine.mine).toEqual({ share: 10000, personal: 21700, total: 31700 });
    expect(mine.estimate).toBeNull();
    const priyas = await as(priya.token).get(`/tolis/${id}/lekha`);
    expect(priyas.body.lekha.totals.mine).toEqual({ share: 55000, personal: 0, total: 55000 });
    expect(JSON.stringify(priyas.body)).not.toContain('217');
    expect(JSON.stringify(priyas.body)).not.toContain('Banana');
  });

  it('compares with TripWise’s estimate for the Sahyatra (in paise)', async () => {
    await seedDestinations();
    const { asha, id } = await setup();
    const planned = await as(asha.token).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: id });
    const trip = await Itinerary.findById(planned.body.itinerary.id).lean();
    expect((await lekha(asha, id)).totals.estimate).toBe(trip!.estimatedCost!.total * 100);
  });
});

describe('outsiders', () => {
  it('get 404', async () => {
    const { rohan, id } = await setup();
    const stranger = await quickUser('Kiran');
    expect((await as(stranger.token).get(`/tolis/${id}/lekha`)).status).toBe(404);
    expect((await as(stranger.token).post(`/tolis/${id}/settlements`, { clientId: 'z', from: rohan.id, to: rohan.id, amount: 100, method: 'cash' })).status).toBe(404);
  });
});
