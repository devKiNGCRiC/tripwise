/**
 * kushal.test.ts — Kushal, the family check-in (for Toli and solo trips alike):
 *   - a traveller adds family contacts (max 5); each gets a private link that needs no account
 *   - the link shows only the first name and the latest check-in: the nearest place, the time,
 *     an optional note and a position rounded to about 1 km — never an email or a history
 *   - a new check-in replaces the old; revoking a contact makes its link stop working
 *   - automatic check-ins are switched on or off by the traveller
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { KushalCheckIn, KushalContact, PotliItem, ToliBudget, ToliExpense, ToliLocation, TripChat } from '../src/db/models/index.js';
import { quickUser, signUp } from './helpers/auth.js';
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
/** The family's view of a link (no login). */
const view = (token: string) => request(app).get(`/api/kushal/${token}`);
/** The token at the end of a Kushal link. */
const tokenOf = (link: string) => link.split('/').pop()!;

/** Near Hampi's Virupaksha Temple. */
const HAMPI = { lat: 15.335234, lon: 76.459812 };

describe('Kushal', () => {
  it('gives each family contact a private link', async () => {
    const asha = await quickUser('Asha Rao', NOW);
    const added = await as(asha.token).post('/me/kushal/contacts', { name: 'Maa' });
    expect(added.status).toBe(201);
    expect(added.body.contact.link).toMatch(/^https:\/\/tripwise\.test\/kushal\/[A-Za-z0-9_-]{24}$/);
    const mine = (await as(asha.token).get('/me/kushal')).body;
    expect(mine).toMatchObject({ auto: false, latest: null, contacts: [{ name: 'Maa' }] });
    const page = await view(tokenOf(added.body.contact.link));
    expect(page.status).toBe(200);
    expect(page.body).toEqual({ kushal: { traveller: 'Asha', latest: null } });
  });

  it('shows only the latest check-in, rounded, and nothing else about the traveller', async () => {
    await seedDestinations();
    const asha = await quickUser('Asha Rao', NOW);
    const link = (await as(asha.token).post('/me/kushal/contacts', { name: 'Papa' })).body.contact.link;
    await as(asha.token).post('/me/kushal/checkin', { lat: 12.9, lon: 77.6 });
    const checked = await as(asha.token).post('/me/kushal/checkin', { ...HAMPI, note: 'All well, reached Hampi' });
    expect(checked.body.latest).toMatchObject({ note: 'All well, reached Hampi', at: NOW.toISOString() });
    expect(await KushalCheckIn.countDocuments()).toBe(1);

    const page = (await view(tokenOf(link))).body.kushal;
    expect(Object.keys(page)).toEqual(['traveller', 'latest']);
    expect(Object.keys(page.latest).sort()).toEqual(['at', 'mapsLink', 'note', 'place', 'position']);
    expect(page.latest.place).toMatch(/^near /);
    expect(page.latest.position).toEqual({ lat: 15.34, lon: 76.46 });
    expect(page.latest.mapsLink).toBe('https://www.google.com/maps?q=15.34,76.46');
    const text = JSON.stringify(page);
    expect(text).not.toContain('quick.test');
    expect(text).not.toContain('15.335234');
  });

  it('checks in without a position too', async () => {
    const asha = await quickUser('Asha', NOW);
    const link = (await as(asha.token).post('/me/kushal/contacts', { name: 'Maa' })).body.contact.link;
    await as(asha.token).post('/me/kushal/checkin', { note: 'No signal for GPS, but all well' });
    expect((await view(tokenOf(link))).body.kushal.latest).toEqual({ place: 'Place not shared', at: NOW.toISOString(), note: 'No signal for GPS, but all well' });
  });

  it('stops a revoked link, and refuses guessed ones', async () => {
    const asha = await quickUser('Asha', NOW);
    const contact = (await as(asha.token).post('/me/kushal/contacts', { name: 'Maa' })).body.contact;
    expect((await as(asha.token).del(`/me/kushal/contacts/${contact.id}`)).status).toBe(204);
    const gone = await view(tokenOf(contact.link));
    expect(gone.status).toBe(404);
    expect(JSON.stringify(gone.body)).not.toContain('Asha');
    expect((await view('nottherealtokenxxxxxxxxx')).status).toBe(404);
    expect((await as(asha.token).get('/me/kushal')).body.contacts).toEqual([]);
  });

  it('allows up to five contacts and checks names', async () => {
    const asha = await quickUser('Asha', NOW);
    for (const name of ['Maa', 'Papa', 'Didi', 'Dada', 'Mama']) expect((await as(asha.token).post('/me/kushal/contacts', { name })).status).toBe(201);
    expect((await as(asha.token).post('/me/kushal/contacts', { name: 'Kaku' })).status).toBe(409);
    expect((await as(asha.token).post('/me/kushal/contacts', { name: '' })).status).toBe(400);
  });

  it('switches automatic check-ins on and off', async () => {
    const asha = await quickUser('Asha', NOW);
    expect((await as(asha.token).patch('/me/kushal', { auto: true })).body.auto).toBe(true);
    expect((await as(asha.token).get('/me/kushal')).body.auto).toBe(true);
  });

  it('refuses positions that aren’t real and long notes', async () => {
    const asha = await quickUser('Asha', NOW);
    expect((await as(asha.token).post('/me/kushal/checkin', { lat: 99, lon: 0 })).status).toBe(400);
    expect((await as(asha.token).post('/me/kushal/checkin', { note: 'x'.repeat(141) })).status).toBe(400);
  });

  it('is wiped with the account, along with the person’s other private trip data', async () => {
    const asha = await signUp(app, 'asha@example.com', 'Asha');
    const link = (await as(asha.token).post('/me/kushal/contacts', { name: 'Maa' })).body.contact.link;
    await as(asha.token).post('/me/kushal/checkin', { lat: 15.3, lon: 76.4 });
    const toli = (await as(asha.token).post('/tolis', { name: 'Solo-ish', type: 'friends' })).body.toli;
    await request(app).put(`/api/tolis/${toli.id}/location`).set('Authorization', `Bearer ${asha.token}`).send({ lat: 15.3, lon: 76.4, for: '1h' });
    await request(app).put(`/api/tolis/${toli.id}/budget`).set('Authorization', `Bearer ${asha.token}`).send({ low: 1000, high: 2000 });
    await as(asha.token).post(`/tolis/${toli.id}/potli`, { text: 'Inhaler', mine: true });
    await as(asha.token).post(`/tolis/${toli.id}/expenses`, { clientId: 'p', title: 'Chai', amount: 2000, category: 'food', method: 'cash', personal: true });
    await TripChat.create({ tripId: 'some-trip', userId: asha.id, messages: [{ role: 'user', text: 'Hi', at: new Date() }] });

    expect((await request(app).delete('/api/me').set('Authorization', `Bearer ${asha.token}`).send({ password: 'password123' })).status).toBe(204);
    expect((await view(tokenOf(link))).status).toBe(404);
    for (const model of [KushalContact, KushalCheckIn, ToliLocation, ToliBudget, PotliItem, TripChat]) expect(await model.countDocuments()).toBe(0);
    expect(await ToliExpense.countDocuments({ personal: true })).toBe(0);
  });

  it('needs a login for the traveller’s own side', async () => {
    expect((await request(app).get('/api/me/kushal')).status).toBe(401);
  });
});
