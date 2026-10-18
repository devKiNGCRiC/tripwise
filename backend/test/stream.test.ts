/**
 * stream.test.ts — POST /itineraries/generate/stream sends the trip day by day as the AI
 * writes it (one JSON event per line), starts over cleanly if a model fails mid-way, and
 * stops the AI and gives the plan back if the traveller leaves.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.js';
import { Usage } from '../src/db/models/index.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { aiTripFixture, fakeAiChain, fakeProvider, plannerChain, tripRequest } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-10-18T10:00:00Z');

/** Split a streamed body into its JSON events. */
const events = (text: string) =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; [key: string]: unknown });

describe('streaming generate', () => {
  it('sends meta, each day with its date, then done — and saves the trip', async () => {
    const app = createApp({ ai: plannerChain(), now: () => NOW });
    const { token } = await signUp(app);
    const res = await request(app).post('/api/itineraries/generate/stream').set('Authorization', `Bearer ${token}`).send(tripRequest());
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/x-ndjson');
    const list = events(res.text);
    expect(list.map((e) => e.type)).toEqual(['meta', 'day', 'day', 'day', 'done']);
    const days = list.filter((e) => e.type === 'day').map((e) => e.day as { dayNumber: number; date: string });
    expect(days.map((d) => d.dayNumber)).toEqual([1, 2, 3]);
    expect(days.map((d) => d.date)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
    const done = list.at(-1) as unknown as { itinerary: { id: string }; quota: { used: number } };
    expect(done.quota.used).toBe(1);
    const saved = await request(app).get(`/api/itineraries/${done.itinerary.id}`).set('Authorization', `Bearer ${token}`);
    expect(saved.status).toBe(200);
  });

  it('answers problems found before streaming as normal JSON errors', async () => {
    const app = createApp({ ai: plannerChain(), now: () => NOW });
    const { token } = await signUp(app);
    const res = await request(app)
      .post('/api/itineraries/generate/stream')
      .set('Authorization', `Bearer ${token}`)
      .send(tripRequest({ startDate: '2026-01-01', endDate: '2026-01-02' }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Start date can't be in the past");
  });

  it('tells the page to start over when a model fails mid-answer', async () => {
    const good = { text: JSON.stringify(aiTripFixture(tripRequest())), chunks: 6 };
    const ai = fakeAiChain(fakeProvider('gemini', [{ partial: '{"title":"Half","summary":"Gone","days":[' }]), fakeProvider('groq', [good]));
    const app = createApp({ ai, now: () => NOW });
    const { token } = await signUp(app);
    const res = await request(app).post('/api/itineraries/generate/stream').set('Authorization', `Bearer ${token}`).send(tripRequest());
    const types = events(res.text).map((e) => e.type);
    expect(types).toEqual(['meta', 'reset', 'meta', 'day', 'day', 'day', 'done']);
  });

  it('still reports success (and keeps the plan used) if reading the quota fails after saving', async () => {
    const app = createApp({ ai: plannerChain(), now: () => NOW });
    const { token } = await signUp(app);
    const spy = vi.spyOn(Usage, 'findOne').mockImplementation(() => {
      throw new Error('database hiccup');
    });
    const res = await request(app).post('/api/itineraries/generate/stream').set('Authorization', `Bearer ${token}`).send(tripRequest());
    const plain = await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(tripRequest({ destination: 'Hampi' }));
    spy.mockRestore();
    expect(events(res.text).at(-1)!.type).toBe('done');
    expect(plain.status).toBe(200);
    const quota = await request(app).get('/api/me/quota').set('Authorization', `Bearer ${token}`);
    expect(quota.body.quota.used).toBe(2);
    const list = await request(app).get('/api/itineraries').set('Authorization', `Bearer ${token}`);
    expect(list.body.itineraries).toHaveLength(2);
  });

  it('ends with an error event when every model fails, and gives the plan back', async () => {
    const ai = fakeAiChain(fakeProvider('gemini', ['error']));
    const app = createApp({ ai, now: () => NOW });
    const { token } = await signUp(app);
    const res = await request(app).post('/api/itineraries/generate/stream').set('Authorization', `Bearer ${token}`).send(tripRequest());
    const last = events(res.text).at(-1) as { type: string; error: { code: string } };
    expect(last.type).toBe('error');
    expect(last.error.code).toBe('AI_UNAVAILABLE');
    const quota = await request(app).get('/api/me/quota').set('Authorization', `Bearer ${token}`);
    expect(quota.body.quota.used).toBe(0);
  });

  it('streams a cached plan straight away', async () => {
    const app = createApp({ ai: plannerChain(), now: () => NOW });
    for (const email of ['a@x.com', 'b@x.com', 'c@x.com']) {
      const { token } = await signUp(app, email);
      await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(tripRequest());
    }
    const { token } = await signUp(app, 'd@x.com');
    const res = await request(app).post('/api/itineraries/generate/stream').set('Authorization', `Bearer ${token}`).send(tripRequest());
    const list = events(res.text);
    expect(list.map((e) => e.type)).toEqual(['meta', 'day', 'day', 'day', 'done']);
    expect((list.at(-1) as unknown as { itinerary: { source: string } }).itinerary.source).toBe('cache');
  });

  it('stops the AI and gives the plan back when the traveller leaves', async () => {
    const slow = fakeProvider('gemini', [{ text: JSON.stringify(aiTripFixture(tripRequest())), chunks: 400 }]);
    const app = createApp({ ai: fakeAiChain(slow), now: () => NOW });
    const { token } = await signUp(app);
    const server = app.listen(0);
    try {
      const { port } = server.address() as AddressInfo;
      const controller = new AbortController();
      const res = await fetch(`http://127.0.0.1:${port}/api/itineraries/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(tripRequest()),
        signal: controller.signal,
      });
      const reader = res.body!.getReader();
      await reader.read(); // the first bytes arrived: the AI is writing
      controller.abort();
      // Wait (up to 3 s) for the server to notice and cancel the model.
      for (let i = 0; i < 60 && !slow.signals[0]?.aborted; i++) await new Promise((r) => setTimeout(r, 50));
      expect(slow.signals[0].aborted).toBe(true);
      await new Promise((r) => setTimeout(r, 100));
      const quota = await request(app).get('/api/me/quota').set('Authorization', `Bearer ${token}`);
      expect(quota.body.quota.used).toBe(0);
    } finally {
      server.close();
    }
  });
});
