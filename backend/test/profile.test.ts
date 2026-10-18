/**
 * profile.test.ts — the traveller's profile: auto-made usernames, editing bio, type, home
 * city, preferences and privacy, and the username rules (unique ignoring case, reserved
 * words, once a day).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let clock = new Date('2026-10-19T10:00:00Z');
let app: Express;
beforeEach(() => {
  clock = new Date('2026-10-19T10:00:00Z');
  app = createApp({ ai: fakeChain(), now: () => clock });
});

/** PATCH /me/profile as someone. */
const patch = (token: string, body: object) => request(app).patch('/api/me/profile').set('Authorization', `Bearer ${token}`).send(body);

describe('usernames', () => {
  it('are made from the name at signup, and differ for people with the same name', async () => {
    const a = await request(app).post('/api/auth/signup').send({ name: 'Asha Rao', email: 'a@x.com', password: 'password123' });
    const b = await request(app).post('/api/auth/signup').send({ name: 'Asha Rao', email: 'b@x.com', password: 'password123' });
    expect(a.body.user.username).toMatch(/^asharao(\d{2,4})?$/);
    expect(b.body.user.username).toMatch(/^asharao(\d{2,4})?$/);
    expect(a.body.user.username).not.toBe(b.body.user.username);
  });

  it('are stored lower-case and unique ignoring case', async () => {
    const a = await signUp(app, 'a@x.com', 'A');
    const b = await signUp(app, 'b@x.com', 'B');
    const mine = await patch(a.token, { username: 'Meera_K' });
    expect(mine.status).toBe(200);
    expect(mine.body.profile.username).toBe('meera_k');
    const taken = await patch(b.token, { username: 'MEERA_K' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.message).toBe('That username is taken');
  });

  it('refuse reserved words and bad shapes', async () => {
    const { token } = await signUp(app);
    expect((await patch(token, { username: 'admin' })).status).toBe(400);
    expect((await patch(token, { username: '9lives' })).status).toBe(400);
    expect((await patch(token, { username: 'ab' })).status).toBe(400);
    expect((await patch(token, { username: 'has space' })).status).toBe(400);
  });

  it('can change once a day', async () => {
    const { token } = await signUp(app);
    expect((await patch(token, { username: 'first_name' })).status).toBe(200);
    const again = await patch(token, { username: 'second_name' });
    expect(again.status).toBe(400);
    expect(again.body.error.message).toBe('You can change your username once a day');
    clock = new Date(clock.getTime() + 25 * 60 * 60 * 1000);
    // A day later the short login token has expired, so log in again first.
    const login = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'password123' });
    expect((await patch(login.body.accessToken, { username: 'second_name' })).status).toBe(200);
  });
});

describe('profile', () => {
  it('round-trips bio, type, home city, preferences, privacy and theme', async () => {
    const { token } = await signUp(app);
    const theme = { tint: '#aabbcc', swatches: ['#111111', '#222222', '#333333', '#444444'], accents: { day: ['#123456', '#234567'], night: ['#abcdef', '#bcdef0'] } };
    const body = {
      bio: 'Chai, mountains and slow mornings.',
      travellerType: 'foodie',
      homeCity: 'Pune',
      preferences: { budget: 4000, interests: ['food', 'nature'], pace: 'chill', travellers: 'couple' },
      privacy: { passport: 'everyone', showJournal: false },
      theme,
    };
    expect((await patch(token, body)).status).toBe(200);
    const res = await request(app).get('/api/me/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject(body);
    expect(res.body.profile.inviteCode).toMatch(/^[A-Za-z0-9]{10}$/);
    expect(res.body.profile).not.toHaveProperty('passwordHash');
  });

  it('starts with friends-only privacy and journals shown', async () => {
    const { token } = await signUp(app);
    const res = await request(app).get('/api/me/profile').set('Authorization', `Bearer ${token}`);
    expect(res.body.profile.privacy).toEqual({ passport: 'friends', showJournal: true });
  });

  it('rejects a bio over 160 characters and an unknown traveller type', async () => {
    const { token } = await signUp(app);
    expect((await patch(token, { bio: 'x'.repeat(161) })).status).toBe(400);
    expect((await patch(token, { travellerType: 'astronaut' })).status).toBe(400);
  });

  it('clears the traveller type with null', async () => {
    const { token } = await signUp(app);
    await patch(token, { travellerType: 'backpacker' });
    const res = await patch(token, { travellerType: null });
    expect(res.body.profile.travellerType).toBeNull();
  });
});
