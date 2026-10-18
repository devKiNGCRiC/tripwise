/**
 * auth.ts (test helper) — sign people up and pull the refresh cookie out of responses.
 */
import request from 'supertest';
import type { Express } from 'express';

/** The `tw_refresh=…` part of a response's Set-Cookie header (or undefined). */
export function refreshCookie(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((cookie) => cookie.startsWith('tw_refresh='))?.split(';')[0];
}

/** Sign up a new traveller; returns their access token, refresh cookie and id. */
export async function signUp(app: Express, email = 'asha@example.com', name = 'Asha') {
  const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'password123' });
  if (res.status !== 200) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken as string, cookie: refreshCookie(res)!, id: res.body.user.id as string };
}
