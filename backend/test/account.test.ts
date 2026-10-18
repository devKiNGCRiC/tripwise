/**
 * account.test.ts — account safety: change password, sign out on all devices, forgot /
 * reset password by email, and deleting the account with everything in it.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { Itinerary, Session, User } from '../src/db/models/index.js';
import type { MailMessage } from '../src/services/mailer.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { plannerChain, tripRequest } from './helpers/fakeAi.js';
import { refreshCookie, signUp } from './helpers/auth.js';
import { TINY_PNG } from './helpers/images.js';
import { befriend, friendsAs } from './helpers/social.js';
import { saveTrip } from './helpers/trips.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let clock = new Date('2026-10-19T10:00:00Z');
let app: Express;
let mail: MailMessage[];
beforeEach(() => {
  clock = new Date('2026-10-19T10:00:00Z');
  mail = [];
  app = createApp({ ai: plannerChain(), now: () => clock, appUrl: 'https://tripwise.test', mailer: async (m) => void mail.push(m) });
});

/** Log in and return the response. */
const login = (password = 'password123') => request(app).post('/api/auth/login').send({ email: 'asha@example.com', password });
/** Pull the reset token out of the last email. */
const tokenFromMail = () => /\/reset-password\/([A-Za-z0-9_-]+)/.exec(mail.at(-1)!.text)![1];

describe('change password', () => {
  it('needs the right current password', async () => {
    const { token } = await signUp(app);
    const res = await request(app).post('/api/me/password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'wrong-one', newPassword: 'newpassword1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Your current password isn't right");
  });

  it('signs out other devices but keeps this one logged in', async () => {
    const { token } = await signUp(app);
    const otherDevice = refreshCookie(await login())!;
    const res = await request(app).post('/api/me/password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'password123', newPassword: 'newpassword1' });
    expect(res.status).toBe(204);
    const thisDevice = refreshCookie(res)!;
    expect(thisDevice).toBeTruthy();
    expect((await request(app).post('/api/auth/refresh').set('Cookie', otherDevice)).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', thisDevice)).status).toBe(200);
    expect((await login('newpassword1')).status).toBe(200);
  });

  it('refuses a short new password', async () => {
    const { token } = await signUp(app);
    const res = await request(app).post('/api/me/password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'password123', newPassword: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('sign out on all devices', () => {
  it('ends every login', async () => {
    const { token, cookie } = await signUp(app);
    const other = refreshCookie(await login())!;
    const res = await request(app).post('/api/auth/logout-all').set('Authorization', `Bearer ${token}`).set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', other)).status).toBe(401);
  });
});

describe('forgot and reset password', () => {
  it('answers the same for unknown emails and sends nothing', async () => {
    const res = await request(app).post('/api/auth/forgot').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mail).toHaveLength(0);
  });

  it('emails a link that resets the password once', async () => {
    await signUp(app);
    const res = await request(app).post('/api/auth/forgot').send({ email: 'ASHA@example.com' });
    expect(res.status).toBe(200);
    expect(mail).toHaveLength(1);
    expect(mail[0].to).toBe('asha@example.com');
    expect(mail[0].text).toContain('https://tripwise.test/reset-password/');
    const token = tokenFromMail();

    const reset = await request(app).post('/api/auth/reset').send({ token, password: 'brandnew123' });
    expect(reset.status).toBe(200);
    expect((await login('brandnew123')).status).toBe(200);
    expect((await login('password123')).status).toBe(401);

    const again = await request(app).post('/api/auth/reset').send({ token, password: 'another123' });
    expect(again.status).toBe(400);
    expect(again.body.error.message).toBe('This reset link has expired. Ask for a new one.');
  });

  it('signs out every device after a reset', async () => {
    const { cookie } = await signUp(app);
    await request(app).post('/api/auth/forgot').send({ email: 'asha@example.com' });
    await request(app).post('/api/auth/reset').send({ token: tokenFromMail(), password: 'brandnew123' });
    expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });

  it('expires links after 30 minutes', async () => {
    await signUp(app);
    await request(app).post('/api/auth/forgot').send({ email: 'asha@example.com' });
    clock = new Date(clock.getTime() + 31 * 60 * 1000);
    const res = await request(app).post('/api/auth/reset').send({ token: tokenFromMail(), password: 'brandnew123' });
    expect(res.status).toBe(400);
  });

  it('sends at most 3 emails an hour per address (still answering 200)', async () => {
    await signUp(app);
    for (let i = 0; i < 4; i++) expect((await request(app).post('/api/auth/forgot').send({ email: 'asha@example.com' })).status).toBe(200);
    expect(mail).toHaveLength(3);
  });
});

describe('delete account', () => {
  it('needs the password, then removes the account and everything in it', async () => {
    const { token } = await signUp(app);
    await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(tripRequest({ startDate: '2026-11-10', endDate: '2026-11-11' }));

    const wrong = await request(app).delete('/api/me').set('Authorization', `Bearer ${token}`).send({ password: 'nope-nope' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.message).toBe("That password isn't right");

    const res = await request(app).delete('/api/me').set('Authorization', `Bearer ${token}`).send({ password: 'password123' });
    expect(res.status).toBe(204);
    expect((await login()).status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
    expect(await Itinerary.countDocuments()).toBe(0);
    expect(await Session.countDocuments()).toBe(0);
  });

  it('also removes friendships and makes their journal photos unreachable', async () => {
    const asha = await signUp(app, 'asha@example.com', 'Asha');
    const ravi = await signUp(app, 'ravi@example.com', 'Ravi');
    await befriend(app, ravi, asha);
    const trip = await saveTrip(asha.id);
    const photo = (
      await request(app).post(`/api/itineraries/${trip}/journal/photos?width=1&height=1`).set('Authorization', `Bearer ${asha.token}`).set('Content-Type', 'image/png').send(TINY_PNG)
    ).body.journal.photos[0];
    const bare = (photo.url as string).split('?')[0];
    expect((await request(app).get(bare).set('Authorization', `Bearer ${ravi.token}`)).status).toBe(200);

    expect((await request(app).delete('/api/me').set('Authorization', `Bearer ${asha.token}`).send({ password: 'password123' })).status).toBe(204);
    expect((await friendsAs(app, ravi.token).list()).body.friends).toEqual([]);
    expect((await request(app).get(bare).set('Authorization', `Bearer ${ravi.token}`)).status).toBe(404);
    expect((await request(app).get(photo.url)).status).toBe(404);
  });
});
