/**
 * adminOverview.test.ts — the admin guard and the overview:
 *   - only admins get in (others 403, signed-out 401)
 *   - counts of travellers, trips by how they were planned, today's AI use, Tolis, sign-ups and
 *     the most planned destinations — and nothing private (no trip titles, no emails)
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { Itinerary, Usage, User } from '../src/db/models/index.js';
import { istDay } from '../src/services/quota.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain, tripRequest } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-11-03T10:00:00Z');
const app = createApp({ ai: fakeChain(), now: () => NOW, appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

/** An admin (Aditi) and a traveller (Rohan). */
async function people() {
  const aditi = await quickUser('Aditi', NOW);
  await User.updateOne({ _id: aditi.id }, { role: 'admin' });
  const rohan = await quickUser('Rohan', NOW);
  return { aditi, rohan };
}

describe('admin guard', () => {
  it('lets only admins in', async () => {
    const { rohan } = await people();
    expect((await as(rohan.token).get('/admin/overview')).status).toBe(403);
    expect((await request(app).get('/api/admin/overview')).status).toBe(401);
  });
});

describe('admin overview', () => {
  it('counts travellers, trips, today’s AI use, Tolis and top destinations — nothing private', async () => {
    await seedDestinations();
    const { aditi, rohan } = await people();
    await as(rohan.token).post('/itineraries/quick', tripRequest({ destination: 'Hampi' }));
    await as(rohan.token).post('/itineraries/quick', tripRequest({ destination: 'Hampi' }));
    await as(rohan.token).post('/tolis', { name: 'Secret Toli', type: 'friends' });
    await Usage.create({ userId: rohan.id, day: istDay(NOW), plans: 2, regens: 1, asks: 3 });
    // Records take the real clock's time; pin them to the test's clock (createdAt can't be changed through the models).
    await User.collection.updateMany({}, { $set: { createdAt: NOW } });
    await Itinerary.collection.updateMany({}, { $set: { createdAt: NOW } });

    const res = await as(aditi.token).get('/admin/overview');
    expect(res.status).toBe(200);
    const o = res.body.overview;
    expect(o.travellers).toEqual({ total: 2, newThisWeek: 2 });
    expect(o.trips7d).toEqual({ ai: 0, cache: 0, local: 2 });
    expect(o.today).toEqual({ plans: 2, regens: 1, asks: 3 });
    expect(o.tolis).toBe(1);
    expect(o.signups30d).toHaveLength(30);
    expect(o.signups30d.at(-1)).toEqual({ date: '2026-11-03', count: 2 });
    expect(o.topDestinations[0]).toEqual({ name: 'Hampi', trips: 2 });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('@quick.test');
    expect(text).not.toContain('Secret Toli');
  });
});
