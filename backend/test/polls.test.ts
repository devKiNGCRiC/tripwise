/**
 * polls.test.ts — deciding together with polls:
 *   - destination polls compare options on TripWise's own facts (best months, cost, top places)
 *   - Tithi (date) polls take several votes each and show the best overlap
 *   - "hasn't voted yet" lists current members only
 *   - no votes after the closing time; only leaders close; a tie needs a chosen winner
 *   - closing records the decision on the Toli (destination, dates, transport)
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { seedDestinations } from '../scripts/seed-destinations.js';
import { ToliActivity } from '../src/db/models/index.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** The clock, movable per test. */
let now = new Date('2026-10-18T10:00:00Z');
const app = createApp({ ai: fakeChain(), now: () => now, appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  put: (path: string, body: object) => request(app).put(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${token}`),
});

/** Asha's Toli with Rohan and Priya. */
async function setup() {
  now = new Date('2026-10-18T10:00:00Z');
  await seedDestinations();
  const asha = await quickUser('Asha');
  const rohan = await quickUser('Rohan');
  const priya = await quickUser('Priya');
  const created = (await as(asha.token).post('/tolis', { name: 'Trip Toli', type: 'friends' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p.token).post(`/toli-invites/${token}/join`);
  return { asha, rohan, priya, id: created.id as string };
}

describe('destination polls', () => {
  it('compares options on TripWise facts', async () => {
    const { rohan, id } = await setup();
    const made = await as(rohan.token).post(`/tolis/${id}/polls`, { kind: 'destination', options: [{ label: 'Hampi' }, { label: 'Atlantis' }] });
    expect(made.status).toBe(201);
    const [hampi, atlantis] = made.body.poll.options;
    expect(made.body.poll.question).toBe('Where shall we go?');
    expect(hampi.facts).toMatchObject({ slug: 'hampi', bestMonths: expect.arrayContaining([11]), avgDailyCost: expect.any(Number) });
    expect(hampi.facts.topPlaces.length).toBeGreaterThan(0);
    expect(atlantis.facts).toBeNull();
  });
});

describe('Tithi polls', () => {
  it('takes several dates per person and shows the best overlap and who hasn’t voted', async () => {
    const { asha, rohan, id } = await setup();
    const poll = (
      await as(asha.token).post(`/tolis/${id}/polls`, {
        kind: 'tithi',
        options: [
          { start: '2026-12-01', end: '2026-12-04' },
          { start: '2026-12-08', end: '2026-12-11' },
        ],
      })
    ).body.poll;
    expect(poll).toMatchObject({ multi: true, question: 'When can you go?' });
    await as(asha.token).put(`/tolis/${id}/polls/${poll.id}/vote`, { optionIds: [poll.options[0].id, poll.options[1].id] });
    await as(rohan.token).put(`/tolis/${id}/polls/${poll.id}/vote`, { optionIds: [poll.options[1].id] });
    const seen = (await as(asha.token).get(`/tolis/${id}/polls`)).body.polls[0];
    expect(seen.counts).toEqual({ [poll.options[0].id]: 1, [poll.options[1].id]: 2 });
    expect(seen.leading).toEqual([poll.options[1].id]);
    expect(seen.notVoted.map((p: { name: string }) => p.name)).toEqual(['Priya']);
  });

  it('refuses dates in the past or longer than 14 days', async () => {
    const { asha, id } = await setup();
    const past = await as(asha.token).post(`/tolis/${id}/polls`, { kind: 'tithi', options: [{ start: '2026-10-01', end: '2026-10-03' }, { start: '2026-12-01', end: '2026-12-02' }] });
    expect(past.status).toBe(400);
    const long = await as(asha.token).post(`/tolis/${id}/polls`, { kind: 'tithi', options: [{ start: '2026-12-01', end: '2026-12-20' }, { start: '2026-12-01', end: '2026-12-02' }] });
    expect(long.status).toBe(400);
  });
});

describe('voting and closing', () => {
  it('drops a member who left from the "hasn’t voted" list', async () => {
    const { asha, priya, id } = await setup();
    const poll = (await as(asha.token).post(`/tolis/${id}/polls`, { kind: 'transport', options: [{ mode: 'train' }, { mode: 'flight' }] })).body.poll;
    await as(priya.token).del(`/tolis/${id}/members/${priya.id}`);
    const seen = (await as(asha.token).get(`/tolis/${id}/polls`)).body.polls.find((p: { id: string }) => p.id === poll.id);
    expect(seen.notVoted.map((p: { name: string }) => p.name).sort()).toEqual(['Asha', 'Rohan']);
  });

  it('takes no votes after the closing time', async () => {
    const { asha, rohan, id } = await setup();
    const poll = (await as(asha.token).post(`/tolis/${id}/polls`, { kind: 'free', question: 'Which homestay?', options: [{ label: 'River view' }, { label: 'Hilltop' }], closesAt: '2026-10-18T10:05:00Z' })).body.poll;
    // Ten minutes later (logins last 15 minutes): the poll has closed.
    now = new Date('2026-10-18T10:10:00Z');
    expect((await as(rohan.token).put(`/tolis/${id}/polls/${poll.id}/vote`, { optionIds: [poll.options[0].id] })).status).toBe(409);
  });

  it('lets only leaders close; a tie needs a winner; the decision is recorded', async () => {
    const { asha, rohan, priya, id } = await setup();
    const poll = (await as(asha.token).post(`/tolis/${id}/polls`, { kind: 'transport', options: [{ mode: 'train' }, { mode: 'flight' }] })).body.poll;
    await as(rohan.token).put(`/tolis/${id}/polls/${poll.id}/vote`, { optionIds: [poll.options[0].id] });
    await as(priya.token).put(`/tolis/${id}/polls/${poll.id}/vote`, { optionIds: [poll.options[1].id] });
    expect((await as(rohan.token).post(`/tolis/${id}/polls/${poll.id}/close`)).status).toBe(403);
    expect((await as(asha.token).post(`/tolis/${id}/polls/${poll.id}/close`)).status).toBe(400);
    const closed = await as(asha.token).post(`/tolis/${id}/polls/${poll.id}/close`, { winner: poll.options[0].id });
    expect(closed.body.poll).toMatchObject({ status: 'closed', winner: poll.options[0].id });
    expect((await as(asha.token).get(`/tolis/${id}`)).body.toli.choices).toEqual({ transport: 'train' });
    expect((await ToliActivity.find({ toliId: id }).lean()).map((a) => a.type)).toEqual(expect.arrayContaining(['poll-created', 'poll-closed']));
  });

  it('records the chosen dates and destination', async () => {
    const { asha, rohan, id } = await setup();
    const dates = (await as(asha.token).post(`/tolis/${id}/polls`, { kind: 'tithi', options: [{ start: '2026-12-01', end: '2026-12-04' }, { start: '2026-12-08', end: '2026-12-11' }] })).body.poll;
    await as(rohan.token).put(`/tolis/${id}/polls/${dates.id}/vote`, { optionIds: [dates.options[1].id] });
    await as(asha.token).post(`/tolis/${id}/polls/${dates.id}/close`);
    const where = (await as(asha.token).post(`/tolis/${id}/polls`, { kind: 'destination', options: [{ label: 'Hampi' }, { label: 'Coorg' }] })).body.poll;
    await as(rohan.token).put(`/tolis/${id}/polls/${where.id}/vote`, { optionIds: [where.options[0].id] });
    await as(asha.token).post(`/tolis/${id}/polls/${where.id}/close`);
    expect((await as(asha.token).get(`/tolis/${id}`)).body.toli.choices).toEqual({ destination: 'Hampi', startDate: '2026-12-08', endDate: '2026-12-11' });
  });

  it('keeps outsiders out', async () => {
    const { id } = await setup();
    const dev = await quickUser('Dev');
    expect((await as(dev.token).get(`/tolis/${id}/polls`)).status).toBe(404);
  });
});
