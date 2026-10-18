/**
 * auth.test.ts — sign up, log in, stay logged in (refresh cookie), log out, and the
 * protections around them (blocked accounts, stolen-token detection, attempt limits).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { User } from '../src/db/models/index.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';
import { refreshCookie, signUp } from './helpers/auth.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** A clock tests can move forward. */
let clock = new Date('2026-10-18T10:00:00Z');
let app: Express;

beforeEach(() => {
  clock = new Date('2026-10-18T10:00:00Z');
  app = createApp({ ai: fakeChain(), now: () => clock });
});

/** Move the clock forward by some seconds. */
const advance = (seconds: number) => {
  clock = new Date(clock.getTime() + seconds * 1000);
};

describe('signup and login', () => {
  it('creates an account, returns a token and sets the refresh cookie', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'Asha', email: 'Asha@Example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('asha@example.com');
    expect(res.body.user.plan).toBe('free');
    expect(typeof res.body.accessToken).toBe('string');
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toContain('tw_refresh=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/api/auth');
    expect(setCookie).toContain('SameSite=Lax');
  });

  it('rejects missing fields and short passwords', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'A', email: 'a@x.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Please give a name, an email and a password of at least 8 characters.');
  });

  it('refuses a second account with the same email', async () => {
    await signUp(app);
    const res = await request(app).post('/api/auth/signup').send({ name: 'Asha', email: 'ASHA@example.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('An account with this email already exists. Try logging in.');
  });

  it('logs in with the right password only', async () => {
    await signUp(app);
    const wrong = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'nope-nope' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.message).toBe('Wrong email or password.');
    const right = await request(app).post('/api/auth/login').send({ email: 'ASHA@example.com', password: 'password123' });
    expect(right.status).toBe(200);
    expect(refreshCookie(right)).toBeTruthy();
  });

  it('keeps blocked accounts out', async () => {
    await signUp(app);
    await User.updateOne({ email: 'asha@example.com' }, { blocked: true });
    const res = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'password123' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('This account has been blocked. Contact support if you think this is a mistake.');
  });

  it('says Google sign-in is not available yet', async () => {
    const res = await request(app).post('/api/auth/google').send({ credential: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Google sign-in isn't available yet.");
  });

  it('limits login attempts to 10 per 15 minutes per IP', async () => {
    for (let i = 0; i < 10; i++) await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'whatever1' });
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', password: 'whatever1' });
    expect(res.status).toBe(429);
  });
});

describe('who am I', () => {
  it('needs a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the signed-in user', async () => {
    const { token } = await signUp(app);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('asha@example.com');
  });

  it('rejects an expired access token (after 15 minutes)', async () => {
    const { token } = await signUp(app);
    advance(16 * 60);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('staying logged in', () => {
  it('swaps the refresh cookie for a new token and a new cookie', async () => {
    const { cookie } = await signUp(app);
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(refreshCookie(res)).toBeTruthy();
    expect(refreshCookie(res)).not.toBe(cookie);
  });

  it('without a cookie says the session expired', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Session expired. Please log in again.');
  });

  it('accepts the old cookie again within 30 seconds (two tabs refreshing together)', async () => {
    const { cookie } = await signUp(app);
    await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    advance(5);
    const again = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(again.status).toBe(200);
  });

  it('treats an old cookie reused later as stolen and ends that login everywhere', async () => {
    const { cookie } = await signUp(app);
    const first = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    const newer = refreshCookie(first)!;
    advance(31);
    const stolen = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(stolen.status).toBe(401);
    const afterTheft = await request(app).post('/api/auth/refresh').set('Cookie', newer);
    expect(afterTheft.status).toBe(401);
  });

  it('stops refreshing once the account is blocked', async () => {
    const { cookie } = await signUp(app);
    await User.updateOne({ email: 'asha@example.com' }, { blocked: true });
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('logs out: the cookie stops working', async () => {
    const { cookie } = await signUp(app);
    const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});
