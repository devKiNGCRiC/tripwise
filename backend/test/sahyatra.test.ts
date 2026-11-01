/**
 * sahyatra.test.ts — a Toli's shared trip (the Sahyatra):
 *   - leaders plan it inside the Toli (Quick plan here); Sahyatris can't
 *   - every Sahyatri can read it and finds it in their trips; outsiders get 404
 *   - only leaders change it (a fresh day, share, delete); Sahyatris get 403
 *   - a new Toli can start from one of the creator's own trips (not someone else's)
 *   - the Toli suggests the members' favourite interests for planning
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { Toli, ToliActivity, User } from '../src/db/models/index.js';
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
  del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${token}`),
});

/** Asha's Toli with Rohan, and its Sahyatra (a Quick plan for Hampi). */
async function withSahyatra() {
  await seedDestinations();
  const asha = await quickUser('Asha');
  const rohan = await quickUser('Rohan');
  const created = await as(asha.token).post('/tolis', { name: 'Hampi Toli', type: 'friends' });
  const id = created.body.toli.id as string;
  await as(rohan.token).post(`/toli-invites/${(created.body.toli.inviteUrl as string).split('/').pop()}/join`);
  const planned = await as(asha.token).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: id });
  return { asha, rohan, id, planned };
}

describe('planning the Sahyatra', () => {
  it('lets a leader plan it inside the Toli', async () => {
    const { id, planned } = await withSahyatra();
    expect(planned.status).toBe(200);
    expect(planned.body.itinerary.toliId).toBe(id);
    expect((await Toli.findById(id))!.tripId).toBe(planned.body.itinerary.id);
    expect((await ToliActivity.find({ toliId: id, type: 'planned' })).length).toBe(1);
  });

  it("doesn't let a Sahyatri plan it, or anyone outside the Toli", async () => {
    const { rohan, id } = await withSahyatra();
    const priya = await quickUser('Priya');
    expect((await as(rohan.token).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: id })).status).toBe(403);
    expect((await as(priya.token).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: id })).status).toBe(404);
  });
});

describe('reading and changing it', () => {
  it('shows it to every Sahyatri, and lists it in their trips', async () => {
    const { rohan, planned } = await withSahyatra();
    const tripId = planned.body.itinerary.id;
    expect((await as(rohan.token).get(`/itineraries/${tripId}`)).status).toBe(200);
    expect((await as(rohan.token).get('/itineraries')).body.itineraries.map((t: { id: string }) => t.id)).toContain(tripId);
    const priya = await quickUser('Priya');
    expect((await as(priya.token).get(`/itineraries/${tripId}`)).status).toBe(404);
  });

  it('lets only leaders change it', async () => {
    const { asha, rohan, id, planned } = await withSahyatra();
    const tripId = planned.body.itinerary.id;
    expect((await as(rohan.token).post(`/itineraries/${tripId}/days/1/regenerate`)).status).toBe(403);
    expect((await as(rohan.token).post(`/itineraries/${tripId}/share`)).status).toBe(403);
    expect((await as(rohan.token).del(`/itineraries/${tripId}`)).status).toBe(403);
    await request(app).patch(`/api/tolis/${id}/members/${rohan.id}`).set('Authorization', `Bearer ${asha.token}`).send({ role: 'sah' });
    expect((await as(rohan.token).post(`/itineraries/${tripId}/days/1/regenerate`)).status).toBe(200);
  });
});

describe('starting a Toli from a trip', () => {
  it("links the creator's own trip, never someone else's", async () => {
    await seedDestinations();
    const asha = await quickUser('Asha');
    const rohan = await quickUser('Rohan');
    const trip = (await as(asha.token).post('/itineraries/quick', tripRequest({ destination: 'Coorg' }))).body.itinerary;
    expect((await as(rohan.token).post('/tolis', { name: 'Not mine', type: 'friends', tripId: trip.id })).status).toBe(404);
    const toli = (await as(asha.token).post('/tolis', { name: 'Coorg Toli', type: 'friends', tripId: trip.id })).body.toli;
    expect(toli.tripId).toBe(trip.id);
    expect((await as(asha.token).get(`/itineraries/${trip.id}`)).body.itinerary.toliId).toBe(toli.id);
    // A trip belongs to one Toli at most.
    expect((await as(asha.token).post('/tolis', { name: 'Again', type: 'friends', tripId: trip.id })).status).toBe(409);
  });
});

describe('plan defaults', () => {
  it("suggests the members' favourite interests", async () => {
    const { asha, rohan, id } = await withSahyatra();
    await User.updateOne({ _id: asha.id }, { 'preferences.interests': ['history', 'food'] });
    await User.updateOne({ _id: rohan.id }, { 'preferences.interests': ['food', 'nature'] });
    expect((await as(rohan.token).get(`/tolis/${id}`)).body.toli.planDefaults.interests).toEqual(['food', 'history', 'nature']);
  });
});
