/**
 * toliBudget.test.ts — budget comfort, kept private:
 *   - each Sahyatri sets the daily range they're comfortable with; everyone sees only the
 *     overlap that suits all who answered (or the gap), never another person's numbers
 *   - someone who leaves drops out of the range; ranges are checked; outsiders get 404
 *   - the Toli view's plan defaults suggest the top of the range as the budget
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { ToliBudget } from '../src/db/models/index.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-10-18T10:00:00Z');
const app = createApp({ ai: fakeChain(), now: () => NOW, appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  put: (path: string, body: object) => request(app).put(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${token}`),
});

/** Asha's Toli with Rohan and Priya. */
async function setup() {
  const asha = await quickUser('Asha');
  const rohan = await quickUser('Rohan');
  const priya = await quickUser('Priya');
  const created = (await as(asha.token).post('/tolis', { name: 'Budget Toli', type: 'friends' })).body.toli;
  const token = (created.inviteUrl as string).split('/').pop();
  for (const p of [rohan, priya]) await as(p.token).post(`/toli-invites/${token}/join`);
  return { asha, rohan, priya, id: created.id as string };
}

describe('budget comfort', () => {
  it('shows everyone the shared range, and nobody else’s numbers', async () => {
    const { asha, rohan, id } = await setup();
    await as(asha.token).put(`/tolis/${id}/budget`, { low: 2000, high: 3100 });
    const mine = await as(rohan.token).put(`/tolis/${id}/budget`, { low: 2600, high: 4000 });
    expect(mine.body.budget).toEqual({ mine: [2600, 4000], group: { answered: 2, members: 3, range: [2600, 3100] } });
    const ashaSees = await as(asha.token).get(`/tolis/${id}/budget`);
    expect(ashaSees.body.budget).toEqual({ mine: [2000, 3100], group: { answered: 2, members: 3, range: [2600, 3100] } });
    // Rohan's own top (4000) appears nowhere in what Asha gets.
    expect(JSON.stringify(ashaSees.body)).not.toContain('4000');
  });

  it('shows the gap when there is no overlap, and nothing before anyone answers', async () => {
    const { asha, rohan, priya, id } = await setup();
    expect((await as(priya.token).get(`/tolis/${id}/budget`)).body.budget).toEqual({ mine: null, group: { answered: 0, members: 3, range: null } });
    await as(asha.token).put(`/tolis/${id}/budget`, { low: 1000, high: 1500 });
    await as(rohan.token).put(`/tolis/${id}/budget`, { low: 2500, high: 4000 });
    expect((await as(priya.token).get(`/tolis/${id}/budget`)).body.budget.group).toEqual({ answered: 2, members: 3, range: null, closest: [1500, 2500] });
  });

  it('drops someone who left, and lets me clear mine', async () => {
    const { asha, rohan, id } = await setup();
    await as(asha.token).put(`/tolis/${id}/budget`, { low: 2000, high: 3000 });
    await as(rohan.token).put(`/tolis/${id}/budget`, { low: 5000, high: 9000 });
    await as(rohan.token).del(`/tolis/${id}/members/${rohan.id}`);
    expect((await as(asha.token).get(`/tolis/${id}/budget`)).body.budget.group).toEqual({ answered: 1, members: 2, range: [2000, 3000] });
    // A leaver's private numbers are deleted, not just hidden.
    expect(await ToliBudget.countDocuments({ toliId: id, userId: rohan.id })).toBe(0);
    await as(asha.token).del(`/tolis/${id}/budget`);
    expect((await as(asha.token).get(`/tolis/${id}/budget`)).body.budget.mine).toBeNull();
  });

  it('suggests the top of the range for planning', async () => {
    const { asha, rohan, id } = await setup();
    await as(asha.token).put(`/tolis/${id}/budget`, { low: 2000, high: 3000 });
    await as(rohan.token).put(`/tolis/${id}/budget`, { low: 2500, high: 4000 });
    expect((await as(asha.token).get(`/tolis/${id}`)).body.toli.planDefaults.budget).toBe(3000);
  });

  it('checks the range, and keeps outsiders out', async () => {
    const { asha, id } = await setup();
    expect((await as(asha.token).put(`/tolis/${id}/budget`, { low: 3000, high: 2000 })).status).toBe(400);
    expect((await as(asha.token).put(`/tolis/${id}/budget`, { low: 50, high: 2000 })).status).toBe(400);
    const dev = await quickUser('Dev');
    expect((await as(dev.token).get(`/tolis/${id}/budget`)).status).toBe(404);
  });
});
