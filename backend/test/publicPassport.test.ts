/**
 * publicPassport.test.ts — someone else's passport at /u/:username follows their privacy
 * choice exactly, never shows upcoming trips, and journal photos follow the same rules.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';
import { TINY_PNG } from './helpers/images.js';
import { befriend, friendsAs } from './helpers/social.js';
import { saveTrip } from './helpers/trips.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let app: Express;
beforeEach(() => {
  app = createApp({ ai: fakeChain(), now: () => new Date('2026-10-19T10:00:00Z') });
});

/** Asha has one finished trip with a journal photo and one upcoming trip; Ravi is her friend; Zoya isn't. */
async function scene() {
  const asha = await signUp(app, 'asha@x.com', 'Asha');
  const ravi = await signUp(app, 'ravi@x.com', 'Ravi');
  const zoya = await signUp(app, 'zoya@x.com', 'Zoya');
  await befriend(app, ravi, asha);
  const trip = await saveTrip(asha.id);
  await saveTrip(asha.id, { startDate: '2026-11-10', endDate: '2026-11-12' });
  const auth = { Authorization: `Bearer ${asha.token}` };
  await request(app).put(`/api/itineraries/${trip}/journal`).set(auth).send({ rating: 5, memory: 'Bliss.' });
  const photo = (await request(app).post(`/api/itineraries/${trip}/journal/photos?width=1&height=1`).set(auth).set('Content-Type', 'image/png').send(TINY_PNG)).body.journal.photos[0];
  return { asha, ravi, zoya, photoUrl: photo.url as string };
}

/** GET someone's passport, as someone or logged out. */
const passportOf = (username: string, token?: string) => {
  const call = request(app).get(`/api/users/${username}/passport`);
  return token ? call.set('Authorization', `Bearer ${token}`) : call;
};

describe('public passports', () => {
  it('with Friends privacy: friends see finished trips and journals, strangers and visitors see nothing', async () => {
    const { asha, ravi, zoya, photoUrl } = await scene();
    const asFriend = await passportOf(asha.username, ravi.token);
    expect(asFriend.status).toBe(200);
    expect(asFriend.body.relation).toBe('friend');
    expect(asFriend.body.passport.stamps).toHaveLength(1);
    expect(asFriend.body.passport.stamps[0].status).toBe('completed');
    expect(asFriend.body.passport.stamps[0].journal).toMatchObject({ rating: 5, photoCount: 1 });
    expect((await request(app).get(photoUrl).set('Authorization', `Bearer ${ravi.token}`)).status).toBe(200);

    const stranger = await passportOf(asha.username, zoya.token);
    expect(stranger.status).toBe(404);
    expect(stranger.body.error.message).toBe('This passport is private');
    expect((await passportOf(asha.username)).status).toBe(404);
    expect((await request(app).get(photoUrl).set('Authorization', `Bearer ${zoya.token}`)).status).toBe(404);
  });

  it('with Everyone privacy: even logged-out visitors can look', async () => {
    const { asha } = await scene();
    await friendsAs(app, asha.token).setPrivacy({ passport: 'everyone' });
    const res = await passportOf(asha.username);
    expect(res.status).toBe(200);
    expect(res.body.relation).toBe('none');
  });

  it('with Only me: not even friends can see it or find the card', async () => {
    const { asha, ravi, zoya } = await scene();
    await friendsAs(app, asha.token).setPrivacy({ passport: 'private' });
    expect((await passportOf(asha.username, ravi.token)).status).toBe(404);
    expect((await friendsAs(app, zoya.token).card(asha.username)).status).toBe(404);
  });

  it('with journals hidden: friends see stamps but no ratings or photos', async () => {
    const { asha, ravi, photoUrl } = await scene();
    await friendsAs(app, asha.token).setPrivacy({ showJournal: false });
    const res = await passportOf(asha.username, ravi.token);
    expect(res.status).toBe(200);
    expect(res.body.passport.stamps[0]).not.toHaveProperty('journal');
    expect((await request(app).get(photoUrl).set('Authorization', `Bearer ${ravi.token}`)).status).toBe(404);
  });

  it('blocked people see nothing, whatever the privacy', async () => {
    const { asha, ravi, photoUrl } = await scene();
    await friendsAs(app, asha.token).setPrivacy({ passport: 'everyone' });
    await friendsAs(app, asha.token).block(ravi.id);
    expect((await passportOf(asha.username, ravi.token)).status).toBe(404);
    expect((await request(app).get(photoUrl).set('Authorization', `Bearer ${ravi.token}`)).status).toBe(404);
  });

  it('answers the same for usernames that do not exist', async () => {
    const res = await passportOf('nobody_at_all');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('This passport is private');
  });
});
