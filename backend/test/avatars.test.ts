/**
 * avatars.test.ts — profile photos: upload, serve (cacheable), replace and remove, and
 * refusing anything that isn't a small real image.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Avatar } from '../src/db/models/index.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';
import { TINY_PNG } from './helpers/images.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const app = createApp({ ai: fakeChain() });

/** PUT /me/avatar with a body and content type. */
const upload = (token: string, body: Buffer, type: string) =>
  request(app).put('/api/me/avatar').set('Authorization', `Bearer ${token}`).set('Content-Type', type).send(body);

describe('avatars', () => {
  it('uploads a photo, serves it with long caching, and removes it', async () => {
    const { token, id } = await signUp(app);
    const res = await upload(token, TINY_PNG, 'image/png');
    expect(res.status).toBe(200);
    expect(res.body.profile.avatarUrl).toMatch(new RegExp(`^/api/avatars/${id}\\?v=\\d+$`));

    const image = await request(app).get(res.body.profile.avatarUrl).buffer(true);
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toBe('image/png');
    expect(image.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(image.body as Buffer, TINY_PNG)).toBe(0);

    const removed = await request(app).delete('/api/me/avatar').set('Authorization', `Bearer ${token}`);
    expect(removed.body.profile).not.toHaveProperty('avatarUrl');
    expect((await request(app).get(`/api/avatars/${id}`)).status).toBe(404);
  });

  it('gives a new photo a new URL', async () => {
    const { token } = await signUp(app);
    const first = await upload(token, TINY_PNG, 'image/png');
    const second = await upload(token, TINY_PNG, 'image/png');
    expect(second.body.profile.avatarUrl).not.toBe(first.body.profile.avatarUrl);
  });

  it('refuses non-images and images over 300 KB, storing nothing', async () => {
    const { token } = await signUp(app);
    const text = await upload(token, Buffer.from('hello'), 'text/plain');
    expect(text.status).toBe(400);
    expect(text.body.error.message).toBe('Please choose a JPG, PNG or WebP image under 300 KB');
    const fake = await upload(token, Buffer.from('not really a png'), 'image/png');
    expect(fake.status).toBe(400);
    const big = await upload(token, Buffer.concat([TINY_PNG, Buffer.alloc(301 * 1024)]), 'image/png');
    expect(big.status).toBe(400);
    expect(big.body.error.message).toBe('Please choose a JPG, PNG or WebP image under 300 KB');
    expect(await Avatar.countDocuments()).toBe(0);
  });

  it('answers 404 for someone without a photo', async () => {
    const { id } = await signUp(app);
    expect((await request(app).get(`/api/avatars/${id}`)).status).toBe(404);
    expect((await request(app).get('/api/avatars/not-an-id')).status).toBe(404);
  });
});
