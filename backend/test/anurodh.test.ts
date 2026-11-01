/**
 * anurodh.test.ts — raising your hand in announcement mode:
 *   - a Sahyatri asks (saying what it's about); only leaders see the request
 *   - one open request at a time; 10 minutes' wait after a decline; leaders can turn requests off
 *   - leaders allow one message, a time window (30 min / 1 h / the whole trip), reply privately, or decline
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signAccess } from '../src/services/tokens.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** The clock, movable per test. */
let now = new Date('2026-10-18T10:00:00Z');
const app = createApp({ ai: fakeChain(), now: () => now, appUrl: 'https://tripwise.test' });
/** Move the clock on by some minutes. */
const later = (minutes: number) => (now = new Date(new Date('2026-10-18T10:00:00Z').getTime() + minutes * 60_000));

/** A request as someone (a login made at the current clock time). */
const as = (user: { id: string }) => {
  const auth = `Bearer ${signAccess({ id: user.id, role: 'user' }, now)}`;
  return {
    get: (path: string) => request(app).get(`/api${path}`).set('Authorization', auth),
    post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', auth).send(body),
    patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', auth).send(body),
  };
};

/** A college Toli (announcement mode): Asha leads, Rohan and Priya are Sahyatris. */
async function setup() {
  later(0);
  const asha = await quickUser('Asha');
  const rohan = await quickUser('Rohan');
  const priya = await quickUser('Priya');
  const created = (await as(asha).post('/tolis', { name: 'Batch Toli', type: 'college' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p).post(`/toli-invites/${token}/join`);
  return { asha, rohan, priya, id: created.id as string };
}

/** Send a chat message. */
let counter = 0;
const say = (user: { id: string }, id: string, text: string) => as(user).post(`/tolis/${id}/messages`, { clientId: `a${++counter}-abcdef`, text });

describe('raising a hand', () => {
  it('shows the request to leaders only', async () => {
    const { asha, rohan, priya, id } = await setup();
    const asked = await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Bus 2 timing changed' });
    expect(asked.status).toBe(201);
    expect((await as(asha).get(`/tolis/${id}/anurodh`)).body.requests.map((r: { about: string; user: { name: string } }) => [r.user.name, r.about])).toEqual([['Rohan', 'Bus 2 timing changed']]);
    const priyaSees = (await as(priya).get(`/tolis/${id}/anurodh`)).body;
    expect(priyaSees.requests).toEqual([]);
    expect(priyaSees.mine).toBeNull();
    expect((await as(rohan).get(`/tolis/${id}/anurodh`)).body.mine).toMatchObject({ about: 'Bus 2 timing changed', status: 'open' });
  });

  it('allows one open request at a time', async () => {
    const { rohan, id } = await setup();
    await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'One' });
    expect((await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Two' })).status).toBe(409);
  });

  it('makes people wait 10 minutes after a decline', async () => {
    const { asha, rohan, id } = await setup();
    const rid = (await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Can I post?' })).body.anurodh.id;
    await as(asha).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: 'decline' });
    later(5);
    const early = await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Please?' });
    expect(early.status).toBe(429);
    expect(early.body.error.message).toBe('Try again in 5 minutes.');
    later(11);
    expect((await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Please?' })).status).toBe(201);
  });

  it('lets leaders turn requests off for someone', async () => {
    const { asha, rohan, id } = await setup();
    expect((await as(rohan).patch(`/tolis/${id}/members/${rohan.id}`, { requestsOff: true })).status).toBe(403);
    await as(asha).patch(`/tolis/${id}/members/${rohan.id}`, { requestsOff: true });
    expect((await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Hello' })).status).toBe(403);
  });

  it("isn't needed when you can already write", async () => {
    const { asha, id } = await setup();
    expect((await as(asha).post(`/tolis/${id}/anurodh`, { about: 'x' })).status).toBe(409);
  });
});

describe('deciding', () => {
  it('allows exactly one message', async () => {
    const { asha, rohan, id } = await setup();
    const rid = (await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Bus 2' })).body.anurodh.id;
    expect((await as(rohan).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: 'one' })).status).toBe(403);
    await as(asha).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: 'one' });
    expect((await say(rohan, id, 'Bus 2 leaves at 7:40.')).status).toBe(201);
    expect((await say(rohan, id, 'Also…')).status).toBe(403);
  });

  it('allows writing for 30 minutes', async () => {
    const { asha, rohan, id } = await setup();
    const rid = (await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Hotel info' })).body.anurodh.id;
    await as(asha).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: '30m' });
    later(20);
    expect((await say(rohan, id, 'Rooms 101–110 are ours.')).status).toBe(201);
    later(31);
    expect((await say(rohan, id, 'One more thing')).status).toBe(403);
  });

  it('answers privately — only the asker sees the reply', async () => {
    const { asha, rohan, priya, id } = await setup();
    const rid = (await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Train time?' })).body.anurodh.id;
    await as(asha).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: 'reply', reply: '7:40 pm, platform 3' });
    expect((await as(rohan).get(`/tolis/${id}/anurodh`)).body.mine).toMatchObject({ status: 'answered', reply: '7:40 pm, platform 3' });
    expect(JSON.stringify((await as(priya).get(`/tolis/${id}/anurodh`)).body)).not.toContain('platform 3');
    // Answering doesn't let them post.
    expect((await say(rohan, id, 'Thanks')).status).toBe(403);
  });

  it('needs a reply text for a private answer, and decides only open requests', async () => {
    const { asha, rohan, id } = await setup();
    const rid = (await as(rohan).post(`/tolis/${id}/anurodh`, { about: 'Train?' })).body.anurodh.id;
    expect((await as(asha).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: 'reply' })).status).toBe(400);
    await as(asha).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: 'decline' });
    expect((await as(asha).post(`/tolis/${id}/anurodh/${rid}/decide`, { action: 'one' })).status).toBe(409);
  });
});
