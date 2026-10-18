/**
 * app.test.ts — the app shell: health check, unknown routes and the error format.
 */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { fakeChain } from './helpers/fakeAi.js';

describe('app shell', () => {
  it('answers the health check', async () => {
    const res = await request(createApp({ ai: fakeChain() })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('answers unknown routes with NOT_FOUND', async () => {
    const res = await request(createApp({ ai: fakeChain() })).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('hides unexpected errors behind a friendly SERVER error', async () => {
    const app = createApp({ ai: fakeChain() }, (router) => {
      router.get('/boom', () => {
        throw new Error('secret internal detail');
      });
    });
    const res = await request(app).get('/api/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('SERVER');
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
  });
});
