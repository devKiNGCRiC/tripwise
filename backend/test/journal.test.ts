/**
 * journal.test.ts — trip journals: a diya rating, a written memory and up to 6 private
 * photos, only for your own finished trips; photos viewable only by those allowed.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';
import { TINY_PNG } from './helpers/images.js';
import { saveTrip } from './helpers/trips.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let app: Express;
beforeEach(() => {
  app = createApp({ ai: fakeChain(), now: () => new Date('2026-10-19T10:00:00Z') });
});

/** Helpers bound to one traveller. */
function as(token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    get: (id: string) => request(app).get(`/api/itineraries/${id}/journal`).set(auth),
    save: (id: string, body: object) => request(app).put(`/api/itineraries/${id}/journal`).set(auth).send(body),
    addPhoto: (id: string, body: Buffer = TINY_PNG, type = 'image/png') =>
      request(app).post(`/api/itineraries/${id}/journal/photos?width=1&height=1&alt=Sunset`).set(auth).set('Content-Type', type).send(body),
    removePhoto: (id: string, photoId: string) => request(app).delete(`/api/itineraries/${id}/journal/photos/${photoId}`).set(auth),
    photo: (url: string) => request(app).get(url).set(auth).buffer(true),
  };
}

describe('journals', () => {
  it('starts empty and saves a rating and a memory', async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    const me = as(asha.token);
    expect((await me.get(trip)).body.journal).toMatchObject({ rating: null, memory: '', photos: [] });
    const saved = await me.save(trip, { rating: 5, memory: 'Sunsets at Palolem.' });
    expect(saved.status).toBe(200);
    expect((await me.get(trip)).body.journal).toMatchObject({ rating: 5, memory: 'Sunsets at Palolem.' });
  });

  it("can't be written before the trip is over", async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id, { startDate: '2026-11-10', endDate: '2026-11-12' });
    const res = await as(asha.token).save(trip, { rating: 4, memory: 'Soon!' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("You can write about this trip once it's over");
  });

  it('checks the rating and the memory length', async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    expect((await as(asha.token).save(trip, { rating: 6, memory: '' })).status).toBe(400);
    expect((await as(asha.token).save(trip, { rating: 3, memory: 'x'.repeat(1001) })).status).toBe(400);
  });

  it('keeps photos private and allows up to 6', async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    const me = as(asha.token);
    let last;
    for (let i = 0; i < 6; i++) last = await me.addPhoto(trip);
    expect(last!.status).toBe(200);
    const photos = last!.body.journal.photos;
    expect(photos).toHaveLength(6);
    expect(photos[0]).toMatchObject({ width: 1, height: 1, alt: 'Sunset' });
    expect(photos[0].url).toMatch(/^\/api\/photos\/[a-f0-9]{24}$/);

    const seventh = await me.addPhoto(trip);
    expect(seventh.status).toBe(400);
    expect(seventh.body.error.message).toBe('A trip can have up to 6 photos');

    const mine = await me.photo(photos[0].url);
    expect(mine.status).toBe(200);
    expect(mine.headers['cache-control']).toContain('private');
    expect(Buffer.compare(mine.body as Buffer, TINY_PNG)).toBe(0);

    // Someone else, and nobody at all, get nothing.
    const ravi = await signUp(app, 'ravi@example.com', 'Ravi');
    expect((await as(ravi.token).photo(photos[0].url)).status).toBe(404);
    expect((await request(app).get(photos[0].url)).status).toBe(404);
  });

  it('refuses non-images', async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    const res = await as(asha.token).addPhoto(trip, Buffer.from('hello'), 'text/plain');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Please choose a JPG, PNG or WebP image under 1.5 MB');
  });

  it('deletes a photo for good', async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    const me = as(asha.token);
    const photo = (await me.addPhoto(trip)).body.journal.photos[0];
    const after = await me.removePhoto(trip, photo.id);
    expect(after.body.journal.photos).toEqual([]);
    expect((await me.photo(photo.url)).status).toBe(404);
  });

  it('removes the journal and its photos when the trip is deleted', async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    const me = as(asha.token);
    const photo = (await me.addPhoto(trip)).body.journal.photos[0];
    expect((await request(app).delete(`/api/itineraries/${trip}`).set('Authorization', `Bearer ${asha.token}`)).status).toBe(204);
    expect((await me.photo(photo.url)).status).toBe(404);
  });

  it("hides other people's journals (404)", async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    const ravi = await signUp(app, 'ravi@example.com', 'Ravi');
    expect((await as(ravi.token).get(trip)).status).toBe(404);
    expect((await as(ravi.token).save(trip, { rating: 1, memory: 'x' })).status).toBe(404);
  });

  it('shows on the passport stamp', async () => {
    const asha = await signUp(app);
    const trip = await saveTrip(asha.id);
    await as(asha.token).save(trip, { rating: 4, memory: 'Lovely.' });
    await as(asha.token).addPhoto(trip);
    const res = await request(app).get('/api/me/passport').set('Authorization', `Bearer ${asha.token}`);
    expect(res.body.passport.stamps[0].journal).toMatchObject({ rating: 4, hasMemory: true, photoCount: 1 });
  });
});
