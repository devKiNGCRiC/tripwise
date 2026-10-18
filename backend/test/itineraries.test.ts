/**
 * itineraries.test.ts — planning a trip with AI, the traveller's saved trips, "new idea"
 * for one day, share links, and privacy (other people's trips are invisible).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import type { AiChain } from '../src/services/ai/chain.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { aiTripFixture, fakeAiChain, fakeProvider, failingChain, plannerChain, tripRequest } from './helpers/fakeAi.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { signUp } from './helpers/auth.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** 15:30 on 18 Oct in India. */
const NOW = new Date('2026-10-18T10:00:00Z');

/** An app with a given AI and clock, plus a signed-up traveller. */
async function setup(ai: AiChain = plannerChain(), now = NOW) {
  const app = createApp({ ai, now: () => now });
  const asha = await signUp(app, 'asha@example.com');
  return { app, asha, auth: { Authorization: `Bearer ${asha.token}` } };
}

/** POST /itineraries/generate as someone. */
const generate = (app: Express, token: string, body: object = tripRequest()) =>
  request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(body);

describe('POST /itineraries/generate', () => {
  it('plans a trip, fills in dates and totals, and uses one plan', async () => {
    const { app, asha } = await setup();
    const res = await generate(app, asha.token);
    expect(res.status).toBe(200);
    const trip = res.body.itinerary;
    expect(trip.days.map((d: { date: string }) => d.date)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    expect(trip.days.map((d: { dayNumber: number }) => d.dayNumber)).toEqual([1, 2, 3]);
    const b = trip.estimatedCost.breakdown;
    expect(trip.estimatedCost.total).toBe(b.stay + b.food + b.transport + b.activities);
    expect(trip.estimatedCost.currency).toBe('INR');
    expect(trip.source).toBe('ai');
    expect(trip.provider).toBe('gemini');
    expect(trip.request.destination).toBe('Goa');
    expect(trip).not.toHaveProperty('ownerId');
    expect(res.body.quota.used).toBe(1);
  });

  it('refuses a 6th plan on the same day', async () => {
    const { app, asha } = await setup();
    for (let i = 0; i < 5; i++) expect((await generate(app, asha.token)).status).toBe(200);
    const res = await generate(app, asha.token);
    expect(res.status).toBe(429);
    expect(res.body.error).toEqual({ code: 'QUOTA_EXCEEDED', message: "You've used all 5 AI plans for today." });
  });

  it('when every AI model fails: 503 and the plan is not used up', async () => {
    const { app, asha, auth } = await setup(failingChain());
    const res = await generate(app, asha.token);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    const quota = await request(app).get('/api/me/quota').set(auth);
    expect(quota.body.quota.used).toBe(0);
  });

  it('checks the request like the planner form does', async () => {
    const { app, asha } = await setup();
    const past = await generate(app, asha.token, tripRequest({ startDate: '2026-10-17', endDate: '2026-10-19' }));
    expect(past.status).toBe(400);
    expect(past.body.error.message).toBe("Start date can't be in the past");
    const backwards = await generate(app, asha.token, tripRequest({ startDate: '2026-11-12', endDate: '2026-11-10' }));
    expect(backwards.body.error.message).toBe('End date must be on or after the start date');
    const long = await generate(app, asha.token, tripRequest({ startDate: '2026-11-01', endDate: '2026-11-15' }));
    expect(long.status).toBe(400);
    expect(long.body.error.message).toBe('Trips can be up to 14 days');
    const noInterests = await generate(app, asha.token, tripRequest({ interests: [] }));
    expect(noInterests.body.error.message).toBe('Pick at least one interest');
    const cheap = await generate(app, asha.token, { ...tripRequest(), budget: { amount: 100, currency: 'INR' } });
    expect(cheap.body.error.message).toBe('Budget must be at least ₹500 a day');
  });

  it('accepts a trip starting "today" just after midnight in India (still yesterday in UTC)', async () => {
    const { app, asha } = await setup(plannerChain(), new Date('2026-10-18T19:00:00Z'));
    const res = await generate(app, asha.token, tripRequest({ startDate: '2026-10-19', endDate: '2026-10-20' }));
    expect(res.status).toBe(200);
  });

  it('needs a login', async () => {
    const res = await request(createApp({ ai: plannerChain() })).post('/api/itineraries/generate').send(tripRequest());
    expect(res.status).toBe(401);
  });
});

describe('saved trips', () => {
  it('lists my trips newest first and opens one', async () => {
    const { app, asha, auth } = await setup();
    await generate(app, asha.token, tripRequest({ destination: 'Goa' }));
    const second = await generate(app, asha.token, tripRequest({ destination: 'Hampi' }));
    const list = await request(app).get('/api/itineraries').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.itineraries.map((t: { request: { destination: string } }) => t.request.destination)).toEqual(['Hampi', 'Goa']);
    const one = await request(app).get(`/api/itineraries/${second.body.itinerary.id}`).set(auth);
    expect(one.body.itinerary.id).toBe(second.body.itinerary.id);
  });

  it("keeps other people's trips invisible (404, never 403)", async () => {
    const { app, asha } = await setup();
    const trip = (await generate(app, asha.token)).body.itinerary;
    const ravi = await signUp(app, 'ravi@example.com', 'Ravi');
    const as = { Authorization: `Bearer ${ravi.token}` };
    expect((await request(app).get(`/api/itineraries/${trip.id}`).set(as)).status).toBe(404);
    expect((await request(app).delete(`/api/itineraries/${trip.id}`).set(as)).status).toBe(404);
    expect((await request(app).post(`/api/itineraries/${trip.id}/share`).set(as)).status).toBe(404);
    expect((await request(app).post(`/api/itineraries/${trip.id}/days/1/regenerate`).set(as)).status).toBe(404);
    expect((await request(app).get('/api/itineraries').set(as)).body.itineraries).toEqual([]);
  });

  it('answers 404 for ids that are not even valid', async () => {
    const { app, auth } = await setup();
    const res = await request(app).get('/api/itineraries/not-an-id').set(auth);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("We couldn't find that trip.");
  });

  it('deletes a trip', async () => {
    const { app, asha, auth } = await setup();
    const trip = (await generate(app, asha.token)).body.itinerary;
    expect((await request(app).delete(`/api/itineraries/${trip.id}`).set(auth)).status).toBe(204);
    expect((await request(app).get(`/api/itineraries/${trip.id}`).set(auth)).status).toBe(404);
  });
});

describe('new idea for one day', () => {
  it('replaces only that day, keeping its date', async () => {
    const { app, asha, auth } = await setup();
    const trip = (await generate(app, asha.token)).body.itinerary;
    const res = await request(app).post(`/api/itineraries/${trip.id}/days/2/regenerate`).set(auth);
    expect(res.status).toBe(200);
    const after = res.body.itinerary;
    expect(after.days[1].theme).not.toBe(trip.days[1].theme);
    expect(after.days[1].date).toBe(trip.days[1].date);
    expect(after.days[1].dayNumber).toBe(2);
    expect(after.days[0]).toEqual(trip.days[0]);
    expect(after.days[2]).toEqual(trip.days[2]);
    // It doesn't use up a full plan.
    expect((await request(app).get('/api/me/quota').set(auth)).body.quota.used).toBe(1);
  });

  it('answers 404 for a day that does not exist', async () => {
    const { app, asha, auth } = await setup();
    const trip = (await generate(app, asha.token)).body.itinerary;
    const res = await request(app).post(`/api/itineraries/${trip.id}/days/9/regenerate`).set(auth);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("We couldn't find that day.");
  });

  it('stops after 15 new ideas a day', async () => {
    const { app, asha, auth } = await setup();
    const trip = (await generate(app, asha.token)).body.itinerary;
    for (let i = 0; i < 15; i++) expect((await request(app).post(`/api/itineraries/${trip.id}/days/1/regenerate`).set(auth)).status).toBe(200);
    const res = await request(app).post(`/api/itineraries/${trip.id}/days/1/regenerate`).set(auth);
    expect(res.status).toBe(429);
    expect(res.body.error.message).toBe("You've used today's fresh ideas — try again tomorrow.");
  });
});

describe('sharing', () => {
  it('gives the same link twice and lets anyone open it without logging in', async () => {
    const { app, asha, auth } = await setup();
    const trip = (await generate(app, asha.token)).body.itinerary;
    const first = await request(app).post(`/api/itineraries/${trip.id}/share`).set(auth);
    const second = await request(app).post(`/api/itineraries/${trip.id}/share`).set(auth);
    expect(first.status).toBe(200);
    expect(first.body.shareId).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(second.body.shareId).toBe(first.body.shareId);
    const shared = await request(app).get(`/api/share/${first.body.shareId}`);
    expect(shared.status).toBe(200);
    expect(shared.body.itinerary.title).toBe(trip.title);
    expect(shared.body.itinerary).not.toHaveProperty('ownerId');
  });

  it("says a missing shared trip isn't available", async () => {
    const res = await request(createApp({ ai: plannerChain() })).get('/api/share/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("This shared trip isn't available.");
  });
});

describe('which world a trip belongs to', () => {
  /** An app whose AI names a given world for every trip. */
  async function withAiRegion(region: string, destination: string) {
    await seedDestinations();
    const req = tripRequest({ destination });
    const ai = fakeAiChain(fakeProvider('gemini', [{ text: JSON.stringify({ ...aiTripFixture(req), region }) }]));
    const { app, asha } = await setup(ai);
    return (await generate(app, asha.token, req)).body.itinerary;
  }

  it("uses the AI's world for places outside the catalogue", async () => {
    expect((await withAiRegion('thar', 'Udaipur')).region).toBe('thar');
  });

  it("trusts the catalogue over the AI for places it knows", async () => {
    expect((await withAiRegion('himalaya', 'Goa')).region).toBe('konkan');
  });

  it('marks catalogue places outside India as abroad', async () => {
    expect((await withAiRegion('none', 'Paris')).region).toBe('abroad');
  });

  it('stores no world when the AI says none', async () => {
    expect((await withAiRegion('none', 'Atlantis')).region).toBeNull();
  });
});
