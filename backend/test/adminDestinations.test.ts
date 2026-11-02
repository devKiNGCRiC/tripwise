/**
 * adminDestinations.test.ts — the catalogue for admins, and hiding a destination:
 *   - each destination with its region, best months, number of places and trips planned (30 days)
 *   - hidden: gone from Explore, its page and places answer 404 — but trips already made still open;
 *     it stays hidden after the catalogue is imported again; the change is in the audit log
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { User } from '../src/db/models/index.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain, tripRequest } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const app = createApp({ ai: fakeChain(), appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

/** The catalogue, an admin and a traveller. */
async function setup() {
  await seedDestinations();
  const aditi = await quickUser('Aditi Admin', new Date());
  await User.updateOne({ _id: aditi.id }, { role: 'admin' });
  const rohan = await quickUser('Rohan', new Date());
  return { aditi, rohan };
}

describe('admin destinations', () => {
  it('lists the catalogue with places and recent trips', async () => {
    const { aditi, rohan } = await setup();
    await as(rohan.token).post('/itineraries/quick', tripRequest({ destination: 'Hampi' }));
    const list = (await as(aditi.token).get('/admin/destinations')).body.destinations;
    const hampi = list.find((d: { slug: string }) => d.slug === 'hampi');
    expect(hampi).toMatchObject({ name: 'Hampi', region: 'deccan', bestMonths: expect.any(Array), hidden: false, trips30d: 1 });
    expect(hampi.places).toBeGreaterThan(10);
    expect((await as(rohan.token).get('/admin/destinations')).status).toBe(403);
  });

  it('hides a destination from Explore without touching trips already made', async () => {
    const { aditi, rohan } = await setup();
    const trip = (await as(rohan.token).post('/itineraries/quick', tripRequest({ destination: 'Hampi' }))).body.itinerary;
    const hidden = await as(aditi.token).patch('/admin/destinations/hampi', { hidden: true });
    expect(hidden.body.destination.hidden).toBe(true);
    const explore = (await request(app).get('/api/destinations')).body.destinations.map((d: { slug: string }) => d.slug);
    expect(explore).not.toContain('hampi');
    expect(explore).toContain('goa');
    expect((await request(app).get('/api/destinations/hampi')).status).toBe(404);
    expect((await request(app).get('/api/destinations/hampi/places')).status).toBe(404);
    expect((await as(rohan.token).get(`/itineraries/${trip.id}`)).status).toBe(200);

    // Importing the catalogue again keeps it hidden.
    await seedDestinations();
    expect((await request(app).get('/api/destinations/hampi')).status).toBe(404);

    await as(aditi.token).patch('/admin/destinations/hampi', { hidden: false });
    expect((await request(app).get('/api/destinations/hampi')).status).toBe(200);
    const log = (await as(aditi.token).get('/admin/actions')).body.actions.map((a: { action: string; target: string }) => `${a.action} ${a.target}`);
    expect(log).toEqual(['show Hampi', 'hide Hampi']);
  });

  it('answers 404 for an unknown destination', async () => {
    const { aditi } = await setup();
    expect((await as(aditi.token).patch('/admin/destinations/atlantis', { hidden: true })).status).toBe(404);
  });
});
