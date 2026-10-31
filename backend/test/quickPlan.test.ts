/**
 * quickPlan.test.ts — TripWise's own planner in the API:
 *   - every AI model down: a catalogue destination still gets a trip (provider "tripwise",
 *     source "local") and today's plan is given back; somewhere we don't know still gets 503
 *   - the same for the day-by-day stream
 *   - POST /itineraries/quick: free and unlimited (works after the 5 AI plans are used), and
 *     404 NO_CATALOGUE for places we don't know enough about
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import type { AiChain } from '../src/services/ai/chain.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { signUp } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { failingChain, plannerChain, tripRequest } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** 15:30 on 18 Oct in India. */
const NOW = new Date('2026-10-18T10:00:00Z');

/** An app with a given AI, a seeded catalogue and a signed-up traveller. */
async function setup(ai: AiChain) {
  await seedDestinations();
  const app = createApp({ ai, now: () => NOW });
  const asha = await signUp(app, 'quick@example.com');
  return { app, token: asha.token };
}

/** POST a trip request to a path as someone. */
const post = (app: Express, token: string, path: string, body: object) => request(app).post(`/api/itineraries/${path}`).set('Authorization', `Bearer ${token}`).send(body);

/** The NDJSON events of a stream response. */
const events = (text: string) => text.trim().split('\n').map((line) => JSON.parse(line) as { type: string; itinerary?: { provider: string }; error?: { code: string } });

describe('when every AI model is down', () => {
  it('plans a catalogue destination itself and gives the plan back', async () => {
    const { app, token } = await setup(failingChain());
    const res = await post(app, token, 'generate', tripRequest({ destination: 'Hampi', interests: ['history'] }));
    expect(res.status).toBe(200);
    expect(res.body.itinerary).toMatchObject({ provider: 'tripwise', source: 'local', region: 'deccan' });
    expect(res.body.itinerary.days).toHaveLength(3);
    expect(res.body.itinerary.days[0].activities[0].place).toMatchObject({ id: expect.stringMatching(/^p_Q/) });
    expect(res.body.quota.used).toBe(0);
  });

  it('still answers 503 for places we don’t know', async () => {
    const { app, token } = await setup(failingChain());
    const res = await post(app, token, 'generate', tripRequest({ destination: 'Atlantis' }));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('falls back in the day-by-day stream too', async () => {
    const { app, token } = await setup(failingChain());
    const res = await post(app, token, 'generate/stream', tripRequest({ destination: 'Hampi' }));
    const all = events(res.text);
    const done = all.find((e) => e.type === 'done');
    expect(done?.itinerary?.provider).toBe('tripwise');
    expect(all.some((e) => e.type === 'error')).toBe(false);
  });
});

describe('POST /itineraries/quick', () => {
  it('is free and unlimited', async () => {
    const { app, token } = await setup(plannerChain());
    for (let i = 0; i < 5; i++) expect((await post(app, token, 'generate', tripRequest())).status).toBe(200);
    expect((await post(app, token, 'generate', tripRequest())).status).toBe(429);
    const res = await post(app, token, 'quick', tripRequest({ destination: 'Coorg', interests: ['nature'] }));
    expect(res.status).toBe(200);
    expect(res.body.itinerary).toMatchObject({ provider: 'tripwise', source: 'local', region: 'ghats' });
    expect(res.body.quota.used).toBe(5);
  });

  it('says so when we don’t know enough places there', async () => {
    const { app, token } = await setup(plannerChain());
    const res = await post(app, token, 'quick', tripRequest({ destination: 'Atlantis' }));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_CATALOGUE');
  });
});
