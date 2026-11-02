/**
 * ask.test.ts — Ask TripWise on a trip (a fake AI and a fake forecast; no real calls):
 *   - the owner asks and gets an answer with chips for real catalogue places (made-up ids dropped)
 *   - a Toli's Sahyatri can ask about the Sahyatra, and sees only their own conversation
 *   - strangers get 404 without using any allowance; the 21st question of a day is refused
 *   - when every AI model fails, the question is given back; when the forecast is down, it still answers
 *   - the conversation is kept (last 30), sent with each question (last 10), and can be cleared
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import type { AiChain } from '../src/services/ai/chain.js';
import type { Prompt } from '../src/services/ai/prompt.js';
import type { DayForecast } from '../src/services/ask/prompt.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { failingChain, fakeAiChain, tripRequest } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-11-02T10:00:00Z');

/** A fake model that names the first catalogue place in the brief, plus one made-up id; it remembers prompts. */
function askingModel() {
  const prompts: Prompt[] = [];
  const provider = {
    name: 'gemini' as const,
    model: 'gemini-fake',
    async *stream(prompt: Prompt) {
      prompts.push(prompt);
      const id = /\[(p_[^\]]+)\]/.exec(prompt.user)?.[1] ?? '';
      yield JSON.stringify({ answer: `Go early — it is cooler. Try ${id}.`, placeIds: [id, 'p_made_up'], followUps: ['What else is nearby?'] });
    },
  };
  return { chain: fakeAiChain(provider), prompts };
}

/** A forecast that answers (or is down). */
const weatherUp = { forecast: async (): Promise<DayForecast[] | null> => [{ date: '2026-11-10', high: 31, low: 20, rainMm: 0, summary: 'clear skies' }] };
const weatherDown = { forecast: async (): Promise<DayForecast[] | null> => null };

/** An app with this AI and forecast. */
const appWith = (ai: AiChain, weather = weatherUp) => createApp({ ai, now: () => NOW, appUrl: 'https://tripwise.test', weather });

/** A request as someone. */
const as = (app: ReturnType<typeof appWith>, token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${token}`),
});

/** Asha's Quick-planned Hampi trip. */
async function hampiTrip(app: ReturnType<typeof appWith>) {
  await seedDestinations();
  const asha = await quickUser('Asha', NOW);
  const trip = (await as(app, asha.token).post('/itineraries/quick', tripRequest({ destination: 'Hampi', interests: ['history'] }))).body.itinerary;
  return { asha, tripId: trip.id as string };
}

describe('Ask TripWise', () => {
  it('answers about the trip with chips for real places only', async () => {
    const { chain, prompts } = askingModel();
    const app = appWith(chain);
    const { asha, tripId } = await hampiTrip(app);
    const res = await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: 'Is it too hot at 2 pm?' });
    expect(res.status).toBe(200);
    expect(res.body.reply).toMatchObject({ role: 'assistant', followUps: ['What else is nearby?'], weatherCredit: true });
    expect(res.body.reply.places).toHaveLength(1);
    expect(res.body.reply.places[0]).toMatchObject({ id: expect.stringMatching(/^p_/), name: expect.any(String), destination: 'hampi' });
    expect(res.body.quota).toMatchObject({ used: 1, limit: 20 });
    // The brief carried the forecast and the question was inside its tags.
    expect(prompts[0].user).toContain('2026-11-10: 20–31 °C');
    expect(prompts[0].user).toContain('<question>Is it too hot at 2 pm?</question>');
    const history = (await as(app, asha.token).get(`/itineraries/${tripId}/ask`)).body;
    expect(history.messages.map((m: { role: string }) => m.role)).toEqual(['user', 'assistant']);
    expect(history.quota.used).toBe(1);
  });

  it('still answers when the forecast is down (without the weather credit)', async () => {
    const { chain, prompts } = askingModel();
    const app = appWith(chain, weatherDown);
    const { asha, tripId } = await hampiTrip(app);
    const res = await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: 'Rain on day 1?' });
    expect(res.status).toBe(200);
    expect(res.body.reply.weatherCredit).toBeUndefined();
    expect(prompts[0].user).toContain('No forecast yet');
  });

  it('sends the recent conversation, keeps the last 30, and clears on request', async () => {
    const { chain, prompts } = askingModel();
    const app = appWith(chain);
    const { asha, tripId } = await hampiTrip(app);
    for (let i = 1; i <= 16; i++) await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: `Question ${i}` });
    expect(prompts.at(-1)!.user).toContain('Traveller: Question 15');
    expect(prompts.at(-1)!.user).not.toContain('Traveller: Question 10\n');
    const kept = (await as(app, asha.token).get(`/itineraries/${tripId}/ask`)).body.messages;
    expect(kept).toHaveLength(30);
    expect(kept[0].text).toBe('Question 2');
    expect((await as(app, asha.token).del(`/itineraries/${tripId}/ask`)).status).toBe(204);
    expect((await as(app, asha.token).get(`/itineraries/${tripId}/ask`)).body.messages).toEqual([]);
  });

  it('lets a Sahyatri ask about the Sahyatra, privately', async () => {
    const { chain } = askingModel();
    const app = appWith(chain);
    await seedDestinations();
    const asha = await quickUser('Asha', NOW);
    const rohan = await quickUser('Rohan', NOW);
    const toli = (await as(app, asha.token).post('/tolis', { name: 'Hampi Toli', type: 'friends' })).body.toli;
    await as(app, rohan.token).post(`/toli-invites/${(toli.inviteUrl as string).split('/').pop()}/join`);
    const trip = (await as(app, asha.token).post('/itineraries/quick', { ...tripRequest({ destination: 'Hampi' }), toliId: toli.id })).body.itinerary;
    await as(app, asha.token).post(`/itineraries/${trip.id}/ask`, { question: 'Asha’s question' });
    expect((await as(app, rohan.token).post(`/itineraries/${trip.id}/ask`, { question: 'Rohan’s question' })).status).toBe(200);
    const rohans = (await as(app, rohan.token).get(`/itineraries/${trip.id}/ask`)).body.messages;
    expect(rohans[0].text).toBe('Rohan’s question');
    expect(JSON.stringify(rohans)).not.toContain('Asha’s question');
  });

  it('gives strangers 404 without using their allowance', async () => {
    const { chain, prompts } = askingModel();
    const app = appWith(chain);
    const { tripId } = await hampiTrip(app);
    const stranger = await quickUser('Kiran', NOW);
    expect((await as(app, stranger.token).post(`/itineraries/${tripId}/ask`, { question: 'Hello?' })).status).toBe(404);
    expect((await as(app, stranger.token).get(`/itineraries/${tripId}/ask`)).status).toBe(404);
    expect(prompts).toHaveLength(0);
  });

  it('refuses the 21st question of the day, and empty or very long ones', async () => {
    const { chain } = askingModel();
    const app = appWith(chain);
    const { asha, tripId } = await hampiTrip(app);
    for (let i = 0; i < 20; i++) expect((await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: `Q${i}` })).status).toBe(200);
    const over = await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: 'One more?' });
    expect(over.status).toBe(429);
    expect(over.body.error.code).toBe('QUOTA_EXCEEDED');
    expect((await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: ' ' })).status).toBe(400);
    expect((await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: 'x'.repeat(301) })).status).toBe(400);
  });

  it('gives the question back when every AI model fails', async () => {
    const app = appWith(failingChain());
    const { asha, tripId } = await hampiTrip(app);
    const res = await as(app, asha.token).post(`/itineraries/${tripId}/ask`, { question: 'Anything?' });
    expect(res.status).toBe(503);
    expect((await as(app, asha.token).get(`/itineraries/${tripId}/ask`)).body).toMatchObject({ messages: [], quota: { used: 0 } });
  });
});
