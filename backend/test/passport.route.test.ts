/**
 * passport.route.test.ts — GET /api/me/passport returns the signed-in traveller's passport,
 * including upcoming trips.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { plannerChain, tripRequest } from './helpers/fakeAi.js';
import { signUp } from './helpers/auth.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('GET /me/passport', () => {
  it("returns my passport with an upcoming trip's stamp", async () => {
    const app = createApp({ ai: plannerChain(), now: () => new Date('2026-10-19T10:00:00Z') });
    const { token } = await signUp(app, 'asha@example.com', 'Asha Rao');
    await request(app).post('/api/itineraries/generate').set('Authorization', `Bearer ${token}`).send(tripRequest());
    const res = await request(app).get('/api/me/passport').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.passport.cover).toMatchObject({ name: 'Asha Rao', username: expect.stringMatching(/^asharao/) });
    expect(res.body.passport.stamps).toHaveLength(1);
    expect(res.body.passport.stamps[0]).toMatchObject({ destination: 'Goa', status: 'upcoming' });
    expect(res.body.passport.worlds).toHaveLength(7);
  });

  it('needs a login', async () => {
    expect((await request(createApp({ ai: plannerChain() })).get('/api/me/passport')).status).toBe(401);
  });
});
