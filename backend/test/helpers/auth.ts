/**
 * auth.ts (test helper) — sign people up and pull the refresh cookie out of responses.
 */
import request from 'supertest';
import type { Express } from 'express';
import { User } from '../../src/db/models/index.js';
import { signAccess } from '../../src/services/tokens.js';
import { newInviteCode } from '../../src/services/username.js';

/** The `tw_refresh=…` part of a response's Set-Cookie header (or undefined). */
export function refreshCookie(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((cookie) => cookie.startsWith('tw_refresh='))?.split(';')[0];
}

/** Sign up a new traveller; returns their access token, refresh cookie and id. */
export async function signUp(app: Express, email = 'asha@example.com', name = 'Asha') {
  const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'password123' });
  if (res.status !== 200) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken as string, cookie: refreshCookie(res)!, id: res.body.user.id as string, username: res.body.user.username as string };
}

/**
 * Create a traveller straight in the database (skips the signup limit of 10 per 15 minutes,
 * for tests that need many people); returns the same shape as signUp.
 */
export async function quickUser(name: string, now = new Date('2026-10-19T10:00:00Z')) {
  const username = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const user = await User.create({ name, email: `${username}@quick.test`, passwordHash: 'x', username, inviteCode: newInviteCode() });
  return { token: signAccess({ id: user._id.toString(), role: 'user' }, now), cookie: '', id: user._id.toString(), username };
}
