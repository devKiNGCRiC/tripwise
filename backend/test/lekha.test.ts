/**
 * lekha.test.ts — a Toli's expenses (Lekha), amounts in paise:
 *   - a group expense is split only among the people who shared it (equally by default, or by
 *     amounts / shares); bad splits, outsiders and silly amounts are refused and nothing is saved
 *   - an offline retry (same clientId) saves it once
 *   - personal expenses are seen only by their owner — not by other members, not in activity
 *   - deleting: whoever added it or leaders (group); the owner only (personal)
 *   - a UPI ID can be shared with the Toli; nobody leaves (or is removed) with money owed
 *   - outsiders get 404
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ToliExpense } from '../src/db/models/index.js';
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
  const created = (await as(asha.token).post('/tolis', { name: 'Money Toli', type: 'friends' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p.token).post(`/toli-invites/${token}/join`);
  return { asha, rohan, priya, id: created.id as string };
}

/** A group expense body (₹900 food, cash) with overrides. */
const expense = (over: object = {}) => ({ clientId: `c-${Math.random()}`, title: 'Thali dinner', amount: 90000, category: 'food', method: 'cash', ...over });

describe('group expenses', () => {
  it('splits only among the people who shared it', async () => {
    const { rohan, priya, id } = await setup();
    const res = await as(rohan.token).post(`/tolis/${id}/expenses`, expense({ split: { kind: 'equal', among: [rohan.id, priya.id] } }));
    expect(res.status).toBe(201);
    const e = res.body.expense;
    expect(e).toMatchObject({ title: 'Thali dinner', amount: 90000, category: 'food', method: 'cash', personal: false, paidBy: { id: rohan.id }, addedBy: { id: rohan.id }, canDelete: true });
    expect(e.shares.map((s: { person: { id: string }; amount: number }) => [s.person.id, s.amount])).toEqual([
      [rohan.id, 45000],
      [priya.id, 45000],
    ]);
  });

  it('splits among everyone by default, and by amounts or shares when asked', async () => {
    const { asha, rohan, priya, id } = await setup();
    const all = (await as(asha.token).post(`/tolis/${id}/expenses`, expense({ amount: 30000 }))).body.expense;
    expect(all.shares.map((s: { amount: number }) => s.amount)).toEqual([10000, 10000, 10000]);
    const byAmounts = await as(asha.token).post(`/tolis/${id}/expenses`, expense({ split: { kind: 'amounts', amounts: { [asha.id]: 60000, [rohan.id]: 30000 } } }));
    expect(byAmounts.status).toBe(201);
    const byShares = (await as(asha.token).post(`/tolis/${id}/expenses`, expense({ amount: 30000, split: { kind: 'shares', shares: { [priya.id]: 2, [rohan.id]: 1 } } }))).body.expense;
    expect(byShares.shares.map((s: { person: { id: string }; amount: number }) => [s.person.id, s.amount])).toEqual([
      [priya.id, 20000],
      [rohan.id, 10000],
    ]);
  });

  it('may be paid by another member', async () => {
    const { asha, priya, id } = await setup();
    const e = (await as(asha.token).post(`/tolis/${id}/expenses`, expense({ paidBy: priya.id }))).body.expense;
    expect(e.paidBy.id).toBe(priya.id);
    expect(e.addedBy.id).toBe(asha.id);
  });

  it('refuses bad splits, outsiders and silly amounts, saving nothing', async () => {
    const { asha, rohan, id } = await setup();
    const stranger = await quickUser('Kiran', NOW);
    const bad = [
      expense({ split: { kind: 'amounts', amounts: { [asha.id]: 60000, [rohan.id]: 20000 } } }),
      expense({ split: { kind: 'equal', among: [asha.id, stranger.id] } }),
      expense({ split: { kind: 'equal', among: [] } }),
      expense({ paidBy: stranger.id }),
      expense({ amount: 0 }),
      expense({ amount: 50_000_001 }),
      expense({ amount: 12.5 }),
      expense({ title: '' }),
      expense({ category: 'gold' }),
      expense({ method: 'cheque' }),
    ];
    for (const body of bad) expect((await as(asha.token).post(`/tolis/${id}/expenses`, body)).status).toBe(400);
    expect(await ToliExpense.countDocuments()).toBe(0);
  });

  it('saves an offline retry (same clientId) only once', async () => {
    const { asha, id } = await setup();
    const body = expense({ clientId: 'phone-1' });
    expect((await as(asha.token).post(`/tolis/${id}/expenses`, body)).status).toBe(201);
    const again = await as(asha.token).post(`/tolis/${id}/expenses`, body);
    expect(again.status).toBe(200);
    expect((await as(asha.token).get(`/tolis/${id}/expenses`)).body.expenses).toHaveLength(1);
  });

  it('lets whoever added it or a leader delete it, and logs it', async () => {
    const { asha, rohan, priya, id } = await setup();
    const e = (await as(rohan.token).post(`/tolis/${id}/expenses`, expense())).body.expense;
    expect((await as(priya.token).get(`/tolis/${id}/expenses`)).body.expenses[0].canDelete).toBe(false);
    expect((await as(priya.token).del(`/tolis/${id}/expenses/${e.id}`)).status).toBe(403);
    expect((await as(asha.token).del(`/tolis/${id}/expenses/${e.id}`)).status).toBe(204);
    expect((await as(rohan.token).get(`/tolis/${id}/expenses`)).body.expenses).toEqual([]);
    const types = (await as(rohan.token).get(`/tolis/${id}/activity`)).body.activity.map((a: { type: string }) => a.type);
    expect(types).toEqual(expect.arrayContaining(['expense-added', 'expense-deleted']));
  });
});

describe('personal expenses', () => {
  it('are seen only by their owner — not by others, not in activity', async () => {
    const { asha, priya, id } = await setup();
    const res = await as(priya.token).post(`/tolis/${id}/expenses`, expense({ title: 'Banana chips', amount: 25000, category: 'shopping', personal: true, paidBy: asha.id }));
    expect(res.status).toBe(201);
    expect(res.body.expense).toMatchObject({ personal: true, paidBy: { id: priya.id } });
    expect(res.body.expense.shares.map((s: { person: { id: string } }) => s.person.id)).toEqual([priya.id]);
    expect((await as(priya.token).get(`/tolis/${id}/expenses`)).body.expenses.map((e: { title: string }) => e.title)).toEqual(['Banana chips']);
    expect(JSON.stringify((await as(asha.token).get(`/tolis/${id}/expenses`)).body)).not.toContain('Banana chips');
    expect(JSON.stringify((await as(asha.token).get(`/tolis/${id}/activity`)).body)).not.toContain('Banana chips');
    // Nobody else can delete it (it doesn't exist for them).
    expect((await as(asha.token).del(`/tolis/${id}/expenses/${res.body.expense.id}`)).status).toBe(404);
    expect((await as(priya.token).del(`/tolis/${id}/expenses/${res.body.expense.id}`)).status).toBe(204);
  });
});

describe('UPI IDs and leaving', () => {
  it('shares a UPI ID with the Toli, checks it, and can remove it', async () => {
    const { asha, priya, id } = await setup();
    const saved = await as(priya.token).patch(`/tolis/${id}/me`, { upi: 'priya@oksbi' });
    expect(saved.status).toBe(200);
    expect(saved.body.toli.me.upi).toBe('priya@oksbi');
    const seen = (await as(asha.token).get(`/tolis/${id}`)).body.toli.members.find((m: { id: string }) => m.id === priya.id);
    expect(seen.upi).toBe('priya@oksbi');
    expect((await as(priya.token).patch(`/tolis/${id}/me`, { upi: 'nope' })).status).toBe(400);
    expect((await as(priya.token).patch(`/tolis/${id}/me`, { upi: null })).body.toli.me.upi).toBeUndefined();
    // Sharing a phone number still works on its own.
    expect((await as(priya.token).patch(`/tolis/${id}/me`, { phone: '98765 43210' })).body.toli.me.phone).toBe('+919876543210');
  });

  it('keeps anyone who owes or is owed money from leaving or being removed', async () => {
    const { asha, rohan, priya, id } = await setup();
    await as(rohan.token).post(`/tolis/${id}/expenses`, expense({ split: { kind: 'equal', among: [rohan.id, priya.id] } }));
    // Priya owes Rohan ₹450.
    const leave = await as(priya.token).del(`/tolis/${id}/members/${priya.id}`);
    expect(leave.status).toBe(409);
    expect(leave.body.error.message).toMatch(/Settle up first/);
    expect((await as(asha.token).del(`/tolis/${id}/members/${priya.id}`)).status).toBe(409);
    // Rohan is owed ₹450: removing him is refused too.
    expect((await as(asha.token).del(`/tolis/${id}/members/${rohan.id}`)).status).toBe(409);
    // Someone with nothing owed either way can still leave.
    const kiran = await quickUser('Kiran', NOW);
    const token = ((await as(asha.token).get(`/tolis/${id}`)).body.toli.inviteUrl as string).split('/').pop();
    await as(kiran.token).post(`/toli-invites/${token}/join`);
    expect((await as(kiran.token).del(`/tolis/${id}/members/${kiran.id}`)).status).toBe(204);
  });
});

describe('outsiders', () => {
  it('get 404', async () => {
    const { id } = await setup();
    const stranger = await quickUser('Kiran', NOW);
    expect((await as(stranger.token).get(`/tolis/${id}/expenses`)).status).toBe(404);
    expect((await as(stranger.token).post(`/tolis/${id}/expenses`, expense())).status).toBe(404);
  });
});
