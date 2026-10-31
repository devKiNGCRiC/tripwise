/**
 * grounding.test.ts — plans grounded in the places catalogue:
 *   findDestination  "Hampi, Karnataka", " HAMPI ", "Leh", "Alleppey" all find the catalogue;
 *                    places we don't know (or abroad) don't
 *   placesFor        a shortlist that leans towards the traveller's interests
 *   tripPrompt       hands the AI the shortlist (and nothing when there is none)
 *   matchPlaces      stops that name a catalogue place — even loosely ("Vittala Temple") —
 *                    get its id and coordinates; others are left alone
 *   generate         a saved AI trip carries the matched places
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { tripPrompt } from '../src/services/ai/prompt.js';
import type { AiTrip } from '../src/services/ai/schema.js';
import { findDestination, matchPlaces, placesFor } from '../src/services/places.js';
import { signUp } from './helpers/auth.js';
import { startTestDb, stopTestDb } from './helpers/db.js';
import { aiTripFixture, fakeAiChain, fakeProvider, tripRequest } from './helpers/fakeAi.js';

beforeAll(async () => {
  await startTestDb();
  await seedDestinations();
});
afterAll(stopTestDb);

describe('findDestination', () => {
  it('finds the catalogue however the place is typed', async () => {
    for (const text of ['hampi', 'Hampi, Karnataka', '  HAMPI  ']) expect((await findDestination(text))?.slug).toBe('hampi');
    expect((await findDestination('Leh'))?.slug).toBe('ladakh');
    expect((await findDestination('Alleppey'))?.slug).toBe('kerala');
    expect((await findDestination('McLeod Ganj'))?.slug).toBe('dharamshala');
    expect((await findDestination('Bijapur'))?.slug).toBe('bijapur');
  });

  it("returns nothing for places it doesn't know", async () => {
    expect(await findDestination('Atlantis')).toBeNull();
    expect(await findDestination('')).toBeNull();
  });
});

describe('placesFor', () => {
  it('shortlists places, leaning towards what the traveller loves', async () => {
    const nature = await placesFor('coorg', ['nature'], 8);
    expect(nature).toHaveLength(8);
    expect(nature.filter((p) => p.interests.includes('nature')).length).toBeGreaterThanOrEqual(6);
    expect(await placesFor('paris', ['culture'], 8)).toEqual([]);
  });
});

describe('tripPrompt', () => {
  it('hands the AI the shortlist, and nothing when there is none', async () => {
    const places = await placesFor('hampi', ['history'], 10);
    const req = tripRequest({ destination: 'Hampi' });
    const grounded = tripPrompt(req, places).user;
    expect(grounded).toContain('Real places at this destination');
    expect(grounded).toContain('Virupaksha Temple');
    expect(tripPrompt(req).user).not.toContain('Real places at this destination');
  });
});

describe('matchPlaces', () => {
  it('links stops that name a catalogue place, even loosely', async () => {
    const places = await placesFor('hampi', [], 40);
    const virupaksha = places.find((p) => p.name === 'Virupaksha Temple')!;
    const vitthala = places.find((p) => p.name.startsWith('Vitthala Temple'))!;
    const [a, b, c] = matchPlaces(
      [
        { title: 'Sunrise at Virupaksha Temple' },
        { title: 'Vittala Temple and the stone chariot' },
        { title: 'Lunch at Mango Tree' },
      ],
      places,
      'Hampi',
    );
    expect(a.place).toEqual({ id: virupaksha.id, lat: virupaksha.lat, lon: virupaksha.lon });
    expect(b.place?.id).toBe(vitthala.id);
    expect(c.place).toBeUndefined();
  });
});

describe('generate', () => {
  it('saves AI trips with the matched places', async () => {
    const req = tripRequest({ destination: 'Hampi' });
    const answer: AiTrip = aiTripFixture(req);
    answer.days[0].activities[0].title = 'Virupaksha Temple';
    const ai = fakeAiChain(fakeProvider('gemini', [{ text: JSON.stringify(answer) }]));
    const app = createApp({ ai, now: () => new Date('2026-10-18T10:00:00Z') });
    const asha = await signUp(app, 'grounded@example.com');
    const res = await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${asha.token}`).send(req);
    expect(res.status).toBe(200);
    expect(res.body.itinerary.days[0].activities[0].place).toMatchObject({ id: expect.stringMatching(/^p_Q/), lat: expect.any(Number), lon: expect.any(Number) });
    expect(res.body.itinerary.days[0].activities[1].place).toBeUndefined();
  });
});
