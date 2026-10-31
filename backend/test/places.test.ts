/**
 * places.test.ts — a destination's places from the catalogue: most famous first, filtered
 * by an interest when asked, credited photos only, unknown destinations 404, and places
 * abroad (not in the catalogue yet) simply have none.
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
/** GET /api/destinations/:slug/places with a query string. */
const places = (slug: string, query = '') => request(app).get(`/api/destinations/${slug}/places${query}`);

describe('destination places', () => {
  it("lists a destination's places, most famous first", async () => {
    const res = await places('hampi');
    expect(res.status).toBe(200);
    const list = res.body.places as { name: string; fame: number; kind: string; lat: number; lon: number }[];
    expect(list.length).toBeGreaterThan(10);
    expect(list.map((p) => p.name)).toContain('Virupaksha Temple');
    expect(list.map((p) => p.fame)).toEqual([...list.map((p) => p.fame)].sort((a, b) => b - a));
    expect(list[0]).toMatchObject({ kind: expect.any(String), lat: expect.any(Number), lon: expect.any(Number) });
    expect(list[0]).not.toHaveProperty('_id');
  });

  it('filters by an interest', async () => {
    const res = await places('coorg', '?interest=nature');
    expect(res.body.places.length).toBeGreaterThan(0);
    for (const p of res.body.places) expect(p.interests).toContain('nature');
  });

  it('only sends photos with a credit', async () => {
    const res = await places('agra');
    const withPhoto = res.body.places.filter((p: { image?: unknown }) => p.image);
    expect(withPhoto.length).toBeGreaterThan(0);
    for (const p of withPhoto) expect(p.image).toMatchObject({ url: expect.stringMatching(/^https:\/\//), credit: expect.stringMatching(/\S/), creditUrl: expect.any(String) });
  });

  it('rejects an unknown interest, 404s an unknown destination and has none abroad yet', async () => {
    expect((await places('hampi', '?interest=karaoke')).status).toBe(400);
    expect((await places('atlantis')).status).toBe(404);
    const paris = await places('paris');
    expect(paris.status).toBe(200);
    expect(paris.body.places).toEqual([]);
  });
});
