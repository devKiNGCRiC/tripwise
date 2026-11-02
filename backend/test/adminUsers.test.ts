/**
 * adminUsers.test.ts — admins helping travellers (and stopping abuse):
 *   - search by name, email or @username; account basics only (never trips or private data)
 *   - block: the traveller can't log in, and their open sessions stop working; unblock lets them back
 *   - free ↔ premium; admins can't block or change themselves or other admins
 *   - every change is in the audit log
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/db/models/index.js';
import { quickUser, refreshCookie, signUp } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const app = createApp({ ai: fakeChain(), appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

/** An admin and Rohan (made directly: signing up is limited to 10 per 15 minutes). */
async function people() {
  const aditi = await quickUser('Aditi Admin', new Date());
  await User.updateOne({ _id: aditi.id }, { role: 'admin' });
  const rohan = await quickUser('Rohan Das', new Date());
  return { aditi, rohan };
}

describe('travellers', () => {
  it('finds travellers by name, email or @username — basics only', async () => {
    const { aditi } = await people();
    const byName = (await as(aditi.token).get('/admin/users?q=rohan')).body;
    expect(byName.total).toBe(1);
    expect(byName.users[0]).toEqual({ id: expect.any(String), name: 'Rohan Das', username: expect.any(String), email: 'rohan_das@quick.test', role: 'user', plan: 'free', blocked: false, joined: expect.any(String), trips: 0 });
    expect((await as(aditi.token).get('/admin/users?q=rohan_das@quick')).body.total).toBe(1);
    expect((await as(aditi.token).get(`/admin/users?q=${byName.users[0].username}`)).body.total).toBe(1);
    expect((await as(aditi.token).get('/admin/users')).body.total).toBe(2);
    // Typed text is searched as text, not as a pattern.
    expect((await as(aditi.token).get('/admin/users?q=.*')).body.total).toBe(0);
  });

  it('blocks a traveller at once, and lets them back', async () => {
    const { aditi } = await people();
    // Rohan logs in with a password here.
    await User.deleteOne({ username: 'rohan_das' });
    const rohan = await signUp(app, 'rohan@example.com', 'Rohan Das');
    const blocked = await as(aditi.token).patch(`/admin/users/${rohan.id}`, { blocked: true });
    expect(blocked.body.user.blocked).toBe(true);
    expect((await request(app).post('/api/auth/login').send({ email: 'rohan@example.com', password: 'password123' })).status).toBe(403);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', rohan.cookie)).status).not.toBe(200);
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${rohan.token}`)).status).toBe(403);
    await as(aditi.token).patch(`/admin/users/${rohan.id}`, { blocked: false });
    const back = await request(app).post('/api/auth/login').send({ email: 'rohan@example.com', password: 'password123' });
    expect(back.status).toBe(200);
    expect(refreshCookie(back)).toBeTruthy();
  });

  it('moves a traveller to premium and back', async () => {
    const { aditi, rohan } = await people();
    expect((await as(aditi.token).patch(`/admin/users/${rohan.id}`, { plan: 'premium' })).body.user.plan).toBe('premium');
    expect((await as(aditi.token).patch(`/admin/users/${rohan.id}`, { plan: 'gold' })).status).toBe(400);
  });

  it('can’t block or change admins (including themselves)', async () => {
    const { aditi } = await people();
    const other = await quickUser('Arjun Admin', new Date());
    await User.updateOne({ _id: other.id }, { role: 'admin' });
    expect((await as(aditi.token).patch(`/admin/users/${aditi.id}`, { blocked: true })).status).toBe(409);
    expect((await as(aditi.token).patch(`/admin/users/${other.id}`, { plan: 'premium' })).status).toBe(409);
    expect((await as(aditi.token).patch('/admin/users/000000000000000000000000', { blocked: true })).status).toBe(404);
  });

  it('keeps everyone else out', async () => {
    const { rohan } = await people();
    expect((await as(rohan.token).get('/admin/users')).status).toBe(403);
    expect((await as(rohan.token).patch(`/admin/users/${rohan.id}`, { plan: 'premium' })).status).toBe(403);
  });
});

describe('audit log', () => {
  it('records who changed what', async () => {
    const { aditi, rohan } = await people();
    await as(aditi.token).patch(`/admin/users/${rohan.id}`, { blocked: true });
    await as(aditi.token).patch(`/admin/users/${rohan.id}`, { plan: 'premium' });
    const actions = (await as(aditi.token).get('/admin/actions')).body.actions;
    expect(actions.map((a: { action: string }) => a.action)).toEqual(['plan', 'block']);
    expect(actions[1]).toMatchObject({ admin: { name: 'Aditi Admin' }, targetType: 'user', target: 'Rohan Das', detail: 'blocked', at: expect.any(String) });
  });
});
