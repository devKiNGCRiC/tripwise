/**
 * locations.test.ts — "Where are my Sahyatris?": strictly opt-in, per person, time-limited.
 *   - sharing for 1 hour shows the Toli who you're near (a catalogue place) and a maps link;
 *     after the hour it's gone
 *   - updating needs an active share; "until the Sangam" needs a Sangam; bad positions refused
 *   - only current members see it: leaving removes your point; outsiders get 404
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { ToliLocation } from '../src/db/models/index.js';
import { signAccess } from '../src/services/tokens.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const START = new Date('2026-11-02T10:00:00Z');
let clock = START;
const app = createApp({ ai: fakeChain(), now: () => clock, appUrl: 'https://tripwise.test' });

/** A request as someone (with a token fresh for the current clock). */
const as = (who: { id: string }) => {
  const auth = `Bearer ${signAccess({ id: who.id, role: 'user' }, clock)}`;
  return {
    get: (path: string) => request(app).get(`/api${path}`).set('Authorization', auth),
    post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', auth).send(body),
    put: (path: string, body: object) => request(app).put(`/api${path}`).set('Authorization', auth).send(body),
    del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', auth),
  };
};

/** Near Hampi's Virupaksha Temple (a catalogue place). */
const HAMPI = { lat: 15.3352, lon: 76.4598 };

/** Asha's Toli with Rohan and Priya. */
async function setup() {
  clock = START;
  const asha = await quickUser('Asha', START);
  const rohan = await quickUser('Rohan', START);
  const priya = await quickUser('Priya', START);
  const created = (await as(asha).post('/tolis', { name: 'Hampi Toli', type: 'friends' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p).post(`/toli-invites/${token}/join`);
  return { asha, rohan, priya, id: created.id as string };
}

describe('where are my Sahyatris', () => {
  it('shows the Toli who is near where, for as long as they chose', async () => {
    await seedDestinations();
    const { asha, rohan, id } = await setup();
    const shared = await as(rohan).put(`/tolis/${id}/location`, { ...HAMPI, accuracy: 20, for: '1h' });
    expect(shared.status).toBe(200);
    expect(shared.body.sharing.until).toBe('2026-11-02T11:00:00.000Z');
    const seen = (await as(asha).get(`/tolis/${id}/locations`)).body;
    expect(seen.me).toBeNull();
    expect(seen.locations).toHaveLength(1);
    const raj = seen.locations[0];
    expect(raj).toMatchObject({ person: { id: rohan.id }, until: '2026-11-02T11:00:00.000Z', at: START.toISOString() });
    expect(raj.near.name).toEqual(expect.any(String));
    expect(raj.near.km).toBeLessThan(5);
    expect(raj.mapsLink).toBe(`https://www.google.com/maps?q=${HAMPI.lat},${HAMPI.lon}`);
    expect((await as(rohan).get(`/tolis/${id}/locations`)).body.me).toEqual({ until: '2026-11-02T11:00:00.000Z' });

    // An update moves the point; after the hour, nothing is shown.
    clock = new Date('2026-11-02T10:30:00Z');
    expect((await as(rohan).put(`/tolis/${id}/location`, { lat: 15.3, lon: 76.4 })).status).toBe(200);
    clock = new Date('2026-11-02T11:01:00Z');
    expect((await as(asha).get(`/tolis/${id}/locations`)).body.locations).toEqual([]);
  });

  it('needs an active share to update, and a Sangam to share until it', async () => {
    const { rohan, id } = await setup();
    expect((await as(rohan).put(`/tolis/${id}/location`, HAMPI)).status).toBe(409);
    expect((await as(rohan).put(`/tolis/${id}/location`, { ...HAMPI, for: 'sangam' })).status).toBe(409);
    expect((await as(rohan).put(`/tolis/${id}/location`, { ...HAMPI, for: 'trip' })).status).toBe(409);
  });

  it('shares until the next Sangam', async () => {
    const { asha, rohan, id } = await setup();
    await as(asha).post(`/tolis/${id}/splits`, { day: 1, dharas: [{ name: 'A' }, { name: 'B' }], sangam: { place: 'Jetty', at: '2026-11-02T12:30:00.000Z' } });
    expect((await as(rohan).put(`/tolis/${id}/location`, { ...HAMPI, for: 'sangam' })).body.sharing.until).toBe('2026-11-02T12:30:00.000Z');
  });

  it('refuses positions that aren’t real', async () => {
    const { rohan, id } = await setup();
    for (const body of [{ lat: 91, lon: 0, for: '1h' }, { lat: 'x', lon: 0, for: '1h' }, { lat: 15, lon: 76, for: '2h' }]) expect((await as(rohan).put(`/tolis/${id}/location`, body)).status).toBe(400);
  });

  it('stops when asked, and when someone leaves the Toli', async () => {
    const { asha, rohan, priya, id } = await setup();
    await as(rohan).put(`/tolis/${id}/location`, { ...HAMPI, for: '1h' });
    await as(priya).put(`/tolis/${id}/location`, { ...HAMPI, for: '1h' });
    expect((await as(rohan).del(`/tolis/${id}/location`)).status).toBe(204);
    expect((await as(priya).del(`/tolis/${id}/members/${priya.id}`)).status).toBe(204);
    expect((await as(asha).get(`/tolis/${id}/locations`)).body.locations).toEqual([]);
    expect(await ToliLocation.countDocuments()).toBe(0);
  });

  it('keeps outsiders out', async () => {
    const { rohan, id } = await setup();
    await as(rohan).put(`/tolis/${id}/location`, { ...HAMPI, for: '1h' });
    const stranger = await quickUser('Kiran', START);
    expect((await as(stranger).get(`/tolis/${id}/locations`)).status).toBe(404);
    expect((await as(stranger).put(`/tolis/${id}/location`, { ...HAMPI, for: '1h' })).status).toBe(404);
  });
});
