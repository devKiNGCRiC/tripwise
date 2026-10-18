/**
 * auth.ts (mock) — fake versions of the /auth/* endpoints.
 * Mirrors the real API's behaviour and error codes so the UI can't tell the difference.
 */
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import type { AuthResponse, LoginInput, SignupInput } from '@/lib/api/types';
import { person, type MockUser } from '../data/users';
import { db, issueAccessToken, mockInviteCode, mockUsername, publicUser, session } from '../db';
import { currentUser, errorResponse, latency } from './shared';

/** Successful login/signup: start the "cookie" session and return user + token. */
function startSession(user: MockUser): Response {
  session.set(user.id);
  return HttpResponse.json<AuthResponse>({ user: publicUser(user), accessToken: issueAccessToken(user.id) });
}

/** Case-insensitive email lookup. */
function findByEmail(email: string) {
  return db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export const authHandlers = [
  // POST /auth/signup — create an account (email must be unique, password ≥ 8 chars).
  http.post(apiUrl('/auth/signup'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<SignupInput>;
    if (!body.name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) {
      return errorResponse(400, 'VALIDATION', 'Please give a name, an email and a password of at least 8 characters.');
    }
    if (findByEmail(body.email)) {
      return errorResponse(409, 'VALIDATION', 'An account with this email already exists. Try logging in.');
    }
    const user: MockUser = person({
      id: `u_${crypto.randomUUID().slice(0, 8)}`,
      name: body.name.trim(),
      username: mockUsername(body.name),
      email: body.email.trim().toLowerCase(),
      password: body.password,
      createdAt: new Date().toISOString(),
      inviteCode: mockInviteCode(),
    });
    db.users.push(user);
    return startSession(user);
  }),

  // POST /auth/login — email + password.
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<LoginInput>;
    const user = body.email ? findByEmail(body.email) : undefined;
    if (!user || user.password !== body.password) {
      return errorResponse(401, 'UNAUTHORIZED', 'Wrong email or password.');
    }
    if (user.blocked) {
      return errorResponse(403, 'FORBIDDEN', 'This account has been blocked. Contact support if you think this is a mistake.');
    }
    return startSession(user);
  }),

  // POST /auth/google — the real API verifies a Google ID token; the mock accepts any credential.
  http.post(apiUrl('/auth/google'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as { credential?: string };
    if (!body.credential) return errorResponse(400, 'VALIDATION', 'Missing Google credential.');
    let user = findByEmail('google.explorer@tripwise.app');
    if (!user) {
      user = person({
        id: 'u_google',
        name: 'Google Explorer',
        username: mockUsername('Google Explorer'),
        email: 'google.explorer@tripwise.app',
        password: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        inviteCode: mockInviteCode(),
      });
      db.users.push(user);
    }
    return startSession(user);
  }),

  // POST /auth/refresh — swap the session "cookie" for a fresh access token.
  http.post(apiUrl('/auth/refresh'), async () => {
    await latency();
    const user = db.users.find((u) => u.id === session.get());
    if (!user || user.blocked) return errorResponse(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
    return HttpResponse.json({ accessToken: issueAccessToken(user.id) });
  }),

  // POST /auth/logout — end the session.
  http.post(apiUrl('/auth/logout'), async () => {
    await latency();
    session.clear();
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /auth/me — who am I?
  http.get(apiUrl('/auth/me'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in to continue.');
    return HttpResponse.json({ user: publicUser(user) });
  }),
];
