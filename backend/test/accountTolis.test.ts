/**
 * accountTolis.test.ts — deleting an account while in Tolis (the owner's rule: settle up and hand
 * over first, exactly like leaving a Toli):
 *   - refused while they are a Sutradhar with others in the Toli ("pass the role first")
 *   - refused while they owe or are owed money in any Toli ("settle up first")
 *   - otherwise they leave every Toli; a Toli where they were the only member goes with them
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Toli, User } from '../src/db/models/index.js';
import { signUp } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const app = createApp({ ai: fakeChain(), appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  deleteAccount: () => request(app).delete('/api/me').set('Authorization', `Bearer ${token}`).send({ password: 'password123' }),
});

/** Asha's "Goa Toli" with Rohan in it. */
async function setup() {
  const asha = await signUp(app, 'asha@example.com', 'Asha');
  const rohan = await signUp(app, 'rohan@example.com', 'Rohan');
  const toli = (await as(asha.token).post('/tolis', { name: 'Goa Toli', type: 'friends' })).body.toli;
  await as(rohan.token).post(`/toli-invites/${(toli.inviteUrl as string).split('/').pop()}/join`);
  return { asha, rohan, id: toli.id as string };
}

describe('deleting an account while in Tolis', () => {
  it('is refused for a Sutradhar until they pass the role on', async () => {
    const { asha, rohan, id } = await setup();
    const refused = await as(asha.token).deleteAccount();
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toMatch(/Goa Toli/);
    expect(refused.body.error.message).toMatch(/Sutradhar/);
    expect(await User.countDocuments({ email: 'asha@example.com' })).toBe(1);
    // After handing over, Asha can go — and is no longer in the Toli.
    await as(asha.token).patch(`/tolis/${id}/members/${rohan.id}`, { role: 'sutradhar' });
    expect((await as(asha.token).deleteAccount()).status).toBe(204);
    expect((await Toli.findById(id))!.members.map((m) => m.userId.toString())).toEqual([rohan.id]);
  });

  it('is refused while money is owed either way', async () => {
    const { asha, rohan, id } = await setup();
    await as(asha.token).post(`/tolis/${id}/expenses`, { clientId: 'e1', title: 'Thali', amount: 60000, category: 'food', method: 'cash' });
    const owes = await as(rohan.token).deleteAccount();
    expect(owes.status).toBe(409);
    expect(owes.body.error.message).toMatch(/Settle up first/);
    expect(owes.body.error.message).toMatch(/Goa Toli/);
    await as(rohan.token).post(`/tolis/${id}/settlements`, { clientId: 's1', from: rohan.id, to: asha.id, amount: 30000, method: 'upi' });
    expect((await as(rohan.token).deleteAccount()).status).toBe(204);
  });

  it('takes a Toli with them when they were its only member', async () => {
    const solo = await signUp(app, 'solo@example.com', 'Solo');
    const toli = (await as(solo.token).post('/tolis', { name: 'Just me', type: 'friends' })).body.toli;
    expect((await as(solo.token).deleteAccount()).status).toBe(204);
    expect(await Toli.findById(toli.id)).toBeNull();
  });
});
