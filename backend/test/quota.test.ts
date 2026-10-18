/**
 * quota.test.ts — daily AI allowances: India-time days, atomic reservations (no double
 * spending when requests race), refunds, and GET /me/quota per plan.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { User } from '../src/db/models/index.js';
import { getQuota, istDay, nextIstMidnight, refund, reserve } from '../src/services/quota.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** 00:30 on 19 Oct in India = 19:00 on 18 Oct in UTC. */
const lateNight = new Date('2026-10-18T19:00:00Z');

describe('India-time days', () => {
  it('counts 00:30 IST as the next day even though UTC is still the day before', () => {
    expect(istDay(lateNight)).toBe('2026-10-19');
    expect(istDay(new Date('2026-10-18T18:29:59Z'))).toBe('2026-10-18');
  });

  it('resets at the next midnight in India', () => {
    expect(nextIstMidnight(lateNight).toISOString()).toBe('2026-10-19T18:30:00.000Z');
  });
});

describe('reserve and refund', () => {
  const user = () => new Types.ObjectId().toString();

  it('allows 5 plans a day on the free plan, then says no', async () => {
    const id = user();
    for (let i = 0; i < 5; i++) expect(await reserve(id, 'free', 'plans', lateNight)).toBe(true);
    expect(await reserve(id, 'free', 'plans', lateNight)).toBe(false);
    expect((await getQuota(id, 'free', lateNight)).used).toBe(5);
  });

  it('lets exactly one of two simultaneous requests take the last plan', async () => {
    const id = user();
    for (let i = 0; i < 4; i++) await reserve(id, 'free', 'plans', lateNight);
    const results = await Promise.all([reserve(id, 'free', 'plans', lateNight), reserve(id, 'free', 'plans', lateNight)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('counts day regenerations separately (15 a day)', async () => {
    const id = user();
    for (let i = 0; i < 15; i++) expect(await reserve(id, 'free', 'regens', lateNight)).toBe(true);
    expect(await reserve(id, 'free', 'regens', lateNight)).toBe(false);
    expect((await getQuota(id, 'free', lateNight)).used).toBe(0);
  });

  it('gives a refunded plan back, never going below zero', async () => {
    const id = user();
    await reserve(id, 'free', 'plans', lateNight);
    await refund(id, 'plans', lateNight);
    await refund(id, 'plans', lateNight);
    expect((await getQuota(id, 'free', lateNight)).used).toBe(0);
  });

  it('starts fresh on a new India day', async () => {
    const id = user();
    for (let i = 0; i < 5; i++) await reserve(id, 'free', 'plans', lateNight);
    const tomorrow = new Date(lateNight.getTime() + 24 * 60 * 60 * 1000);
    expect(await reserve(id, 'free', 'plans', tomorrow)).toBe(true);
  });
});

describe('GET /me/quota', () => {
  it('shows the free allowance, then the premium one', async () => {
    const app = createApp({ ai: fakeChain(), now: () => lateNight });
    const { token, id } = await signUp(app);
    const free = await request(app).get('/api/me/quota').set('Authorization', `Bearer ${token}`);
    expect(free.status).toBe(200);
    expect(free.body.quota).toEqual({ used: 0, limit: 5, resetsAt: '2026-10-19T18:30:00.000Z' });

    await User.updateOne({ _id: id }, { plan: 'premium' });
    const premium = await request(app).get('/api/me/quota').set('Authorization', `Bearer ${token}`);
    expect(premium.body.quota.limit).toBe(50);
  });

  it('needs a login', async () => {
    const res = await request(createApp({ ai: fakeChain() })).get('/api/me/quota');
    expect(res.status).toBe(401);
  });
});
