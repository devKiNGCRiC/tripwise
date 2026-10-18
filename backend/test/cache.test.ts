/**
 * cache.test.ts — similar trips re-use earlier AI plans: instant, free for the traveller,
 * and never the same plan twice for the same person.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { budgetBand, cacheKey } from '../src/services/cache.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { plannerChain, plannerProvider, tripRequest } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-10-18T10:00:00Z');

describe('cache key', () => {
  it('ignores spacing, letter case and the order of interests', () => {
    expect(cacheKey(tripRequest({ destination: '  goa ' }))).toBe(cacheKey(tripRequest({ destination: 'Goa' })));
    expect(cacheKey(tripRequest({ destination: 'North   Goa' }))).toBe(cacheKey(tripRequest({ destination: 'north goa' })));
    expect(cacheKey(tripRequest({ interests: ['culture', 'food'] }))).toBe(cacheKey(tripRequest({ interests: ['food', 'culture'] })));
  });

  it('separates different months, lengths, groups, paces and budget bands', () => {
    const base = cacheKey(tripRequest());
    expect(cacheKey(tripRequest({ startDate: '2026-12-10', endDate: '2026-12-12' }))).not.toBe(base);
    expect(cacheKey(tripRequest({ endDate: '2026-11-13' }))).not.toBe(base);
    expect(cacheKey(tripRequest({ travellers: 'family' }))).not.toBe(base);
    expect(cacheKey(tripRequest({ pace: 'chill' }))).not.toBe(base);
    expect(cacheKey(tripRequest({ budget: { amount: 9000, currency: 'INR' } }))).not.toBe(base);
    // Same band → same key.
    expect(cacheKey(tripRequest({ budget: { amount: 3500, currency: 'INR' } }))).toBe(base);
  });

  it('puts budgets in bands', () => {
    expect(budgetBand(1500)).toBe('budget');
    expect(budgetBand(2500)).toBe('mid');
    expect(budgetBand(6999)).toBe('mid');
    expect(budgetBand(7000)).toBe('luxury');
  });
});

describe('generate with the cache', () => {
  it('after 3 plans exist, a new traveller gets one instantly, free, without AI', async () => {
    const provider = plannerProvider();
    const app = createApp({ ai: plannerChain(provider), now: () => NOW });
    for (const email of ['a@x.com', 'b@x.com', 'c@x.com']) {
      const { token } = await signUp(app, email);
      const res = await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(tripRequest());
      expect(res.body.itinerary.source).toBe('ai');
    }
    expect(provider.calls).toBe(3);

    const { token } = await signUp(app, 'd@x.com');
    const res = await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(tripRequest());
    expect(res.status).toBe(200);
    expect(res.body.itinerary.source).toBe('cache');
    expect(res.body.itinerary.provider).toBe('gemini');
    expect(res.body.itinerary.days[0].date).toBe('2026-11-10');
    expect(res.body.quota.used).toBe(0);
    expect(provider.calls).toBe(3);
  });

  it('never gives the same person the same cached plan twice, then writes a new one', async () => {
    const provider = plannerProvider();
    const app = createApp({ ai: plannerChain(provider), now: () => NOW });
    // Fill the pool with 3 plans from someone else.
    const other = await signUp(app, 'other@x.com');
    for (let i = 0; i < 3; i++) await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${other.token}`).send(tripRequest());

    const { token } = await signUp(app, 'me@x.com');
    const titles = new Set<string>();
    const sources: string[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(tripRequest());
      sources.push(res.body.itinerary.source);
      titles.add(JSON.stringify(res.body.itinerary.days));
    }
    expect(sources).toEqual(['cache', 'cache', 'cache', 'ai']);
    expect(titles.size).toBe(4);
  });
});
