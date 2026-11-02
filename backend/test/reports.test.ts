/**
 * reports.test.ts — reporting a public passport, and what admins do with reports:
 *   - anyone signed in can report someone else's passport (a reason, an optional note)
 *   - limits: not yourself, one open report per passport, 5 a day
 *   - admins see open reports (with the passport's public bio) and dismiss, remove the content
 *     (bio, photo, passport made friends-only) or block the account — each in the audit log
 *   - deleting an account removes reports by and about it
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Avatar, Report, User } from '../src/db/models/index.js';
import { quickUser, signUp } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const app = createApp({ ai: fakeChain(), appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
});

/** An admin, a reporter (Priya) and a spammer (Sunny) with a public bio. */
async function setup() {
  const aditi = await quickUser('Aditi Admin', new Date());
  await User.updateOne({ _id: aditi.id }, { role: 'admin' });
  const priya = await quickUser('Priya', new Date());
  const sunny = await quickUser('Sunny Spam', new Date());
  await User.updateOne({ _id: sunny.id }, { bio: 'Cheap loans! Call now', 'privacy.passport': 'everyone', avatar: { version: 1 } });
  return { aditi, priya, sunny };
}

describe('reporting a passport', () => {
  it('takes a report, once, and not about yourself', async () => {
    const { priya, sunny } = await setup();
    const res = await as(priya.token).post('/reports', { username: sunny.username, reason: 'spam', note: 'Selling loans' });
    expect(res.status).toBe(201);
    expect((await as(priya.token).post('/reports', { username: sunny.username, reason: 'offensive' })).status).toBe(409);
    expect((await as(priya.token).post('/reports', { username: priya.username, reason: 'spam' })).status).toBe(400);
    expect((await as(priya.token).post('/reports', { username: 'nobody_here', reason: 'spam' })).status).toBe(404);
    expect((await as(priya.token).post('/reports', { username: sunny.username, reason: 'boring' })).status).toBe(400);
  });

  it('allows 5 reports a day per person', async () => {
    const { priya } = await setup();
    for (let i = 0; i < 5; i++) {
      const target = await quickUser(`Target ${i}`, new Date());
      expect((await as(priya.token).post('/reports', { username: target.username, reason: 'spam' })).status).toBe(201);
    }
    const sixth = await quickUser('Target 6', new Date());
    expect((await as(priya.token).post('/reports', { username: sixth.username, reason: 'spam' })).status).toBe(429);
  });
});

describe('admins and reports', () => {
  it('shows open reports with the public bio, and dismisses', async () => {
    const { aditi, priya, sunny } = await setup();
    await as(priya.token).post('/reports', { username: sunny.username, reason: 'spam', note: 'Selling loans' });
    const open = (await as(aditi.token).get('/admin/reports?status=open')).body.reports;
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ reason: 'spam', note: 'Selling loans', status: 'open', reporter: { name: 'Priya' }, target: { name: 'Sunny Spam', bio: 'Cheap loans! Call now' } });
    const done = await as(aditi.token).post(`/admin/reports/${open[0].id}`, { action: 'dismiss' });
    expect(done.body.report).toMatchObject({ status: 'dismissed', action: 'dismiss' });
    expect((await as(aditi.token).get('/admin/reports?status=open')).body.reports).toEqual([]);
    expect((await as(priya.token).get('/admin/reports')).status).toBe(403);
  });

  it('removes the content of a reported passport', async () => {
    const { aditi, priya, sunny } = await setup();
    await Avatar.create({ userId: sunny.id, data: Buffer.from('x'), contentType: 'image/png' }).catch(() => undefined);
    await as(priya.token).post('/reports', { username: sunny.username, reason: 'spam' });
    const [report] = (await as(aditi.token).get('/admin/reports')).body.reports;
    expect((await as(aditi.token).post(`/admin/reports/${report.id}`, { action: 'remove-content' })).body.report.status).toBe('actioned');
    const after = await User.findById(sunny.id).lean();
    expect(after).toMatchObject({ bio: '', avatar: null, privacy: { passport: 'friends' } });
    expect(after!.blocked).toBe(false);
    expect((await as(aditi.token).get('/admin/actions')).body.actions[0]).toMatchObject({ action: 'report', target: 'Sunny Spam', detail: 'removed content' });
  });

  it('blocks a reported account', async () => {
    const { aditi, priya, sunny } = await setup();
    await as(priya.token).post('/reports', { username: sunny.username, reason: 'impersonation' });
    const [report] = (await as(aditi.token).get('/admin/reports')).body.reports;
    await as(aditi.token).post(`/admin/reports/${report.id}`, { action: 'block' });
    expect((await User.findById(sunny.id).lean())!.blocked).toBe(true);
  });
});

describe('deleting an account', () => {
  it('removes reports by and about it', async () => {
    const { priya, sunny } = await setup();
    const asha = await signUp(app, 'asha@example.com', 'Asha');
    await as(asha.token).post('/reports', { username: sunny.username, reason: 'spam' });
    await as(priya.token).post('/reports', { username: asha.username, reason: 'other' });
    expect(await Report.countDocuments()).toBe(2);
    expect((await request(app).delete('/api/me').set('Authorization', `Bearer ${asha.token}`).send({ password: 'password123' })).status).toBe(204);
    expect(await Report.countDocuments()).toBe(0);
  });
});
