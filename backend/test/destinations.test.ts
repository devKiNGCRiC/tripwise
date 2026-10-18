/**
 * destinations.test.ts — the Explore catalogue: seeding, filters, search and single places.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

// One seeded database for the whole file (these tests only read).
beforeAll(async () => {
  await startTestDb();
  await seedDestinations();
});
afterAll(stopTestDb);

const app = createApp({ ai: fakeChain() });
/** GET /api/destinations with a query string. */
const list = (query = '') => request(app).get(`/api/destinations${query}`);

describe('destinations', () => {
  it('seeds all 12 places, in catalogue order, safe to run twice', async () => {
    expect(await seedDestinations()).toBe(12);
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.destinations).toHaveLength(12);
    expect(res.body.destinations[0].slug).toBe('goa');
    expect(res.body.destinations[0]).not.toHaveProperty('_id');
    expect(res.body.destinations[0]).not.toHaveProperty('order');
    expect(res.body.destinations[0].id).toBe('d_goa');
  });

  it('filters by vibe, budget and month together', async () => {
    const res = await list('?vibe=beach&month=12');
    expect(res.body.destinations.length).toBeGreaterThan(0);
    for (const d of res.body.destinations) {
      expect(d.vibes).toContain('beach');
      expect(d.bestMonths).toContain(12);
    }
    const budget = await list('?budget=budget');
    for (const d of budget.body.destinations) expect(d.budgetTier).toBe('budget');
  });

  it('searches names and countries without caring about case', async () => {
    const res = await list('?q=GO');
    expect(res.body.destinations.map((d: { slug: string }) => d.slug)).toContain('goa');
    const country = await list('?q=france');
    expect(country.body.destinations.map((d: { slug: string }) => d.slug)).toEqual(['paris']);
  });

  it('treats search text literally (no crash on regex characters)', async () => {
    const res = await list('?q=(');
    expect(res.status).toBe(200);
    expect(res.body.destinations).toEqual([]);
  });

  it('rejects an impossible month', async () => {
    const res = await list('?month=13');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });

  it('returns one destination by slug, or NOT_FOUND', async () => {
    const goa = await request(app).get('/api/destinations/goa');
    expect(goa.status).toBe(200);
    expect(goa.body.destination.name).toBe('Goa');
    const none = await request(app).get('/api/destinations/nowhere');
    expect(none.status).toBe(404);
    expect(none.body.error.message).toBe("We couldn't find that destination.");
  });
});
