/**
 * handlers.test.ts — checks the mock backend behaves like the real API will:
 * correct shapes, correct error codes, filters that actually filter.
 * Goes through the real `api` client + endpoint helpers, so this also proves
 * the client and the mocks agree on URLs.
 */
import { describe, expect, it } from 'vitest';
import { api } from '@/lib/api/client';
import { authApi, destinationsApi } from '@/lib/api/endpoints';
import { session } from './db';

describe('mock auth API', () => {
  it('logs in the demo user and starts a session', async () => {
    const res = await authApi.login({ email: 'demo@tripwise.app', password: 'password123' });
    expect(res.user).toMatchObject({ id: 'u_demo', role: 'user' });
    expect(res.user).not.toHaveProperty('password');
    expect(res.accessToken).toBeTruthy();
    expect(session.get()).toBe('u_demo');
  });

  it('rejects a wrong password with UNAUTHORIZED', async () => {
    await expect(authApi.login({ email: 'demo@tripwise.app', password: 'nope-nope' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Wrong email or password.',
    });
  });

  it('rejects a blocked account with FORBIDDEN', async () => {
    await expect(authApi.login({ email: 'blocked@tripwise.app', password: 'password123' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses to sign up an email that already exists', async () => {
    await expect(authApi.signup({ name: 'Copy Cat', email: 'DEMO@tripwise.app', password: 'password123' })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('restores a session via refresh and returns the current user from /auth/me', async () => {
    session.set('u_admin');
    expect(await api.refreshSession()).toBe(true);
    const { user } = await authApi.me();
    expect(user.role).toBe('admin');
  });
});

describe('mock destinations API', () => {
  it('lists 12 destinations', async () => {
    const { destinations } = await destinationsApi.list();
    expect(destinations).toHaveLength(12);
  });

  it('filters by vibe and budget', async () => {
    const { destinations } = await destinationsApi.list({ vibe: 'beach', budget: 'luxury' });
    expect(destinations.length).toBeGreaterThan(0);
    destinations.forEach((d) => {
      expect(d.vibes).toContain('beach');
      expect(d.budgetTier).toBe('luxury');
    });
  });

  it('returns NOT_FOUND for an unknown slug', async () => {
    await expect(destinationsApi.get('atlantis')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
