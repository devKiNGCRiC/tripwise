/**
 * TintSync.test.tsx — "Your colours" stay put: they survive a refresh on this device
 * (signed in or not), come back from your account when you log in (also on a new
 * device), a guest's choice is kept on the account they then sign in to, and logging
 * out returns the device to the region's own colours.
 */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { api } from '@/lib/api/client';
import { profileApi } from '@/lib/api/endpoints';
import type { ThemePalette } from '@/lib/api/types';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';
import { TINT_STORAGE_KEY } from './WorldProvider';

/** A sunset palette, as read from a photo. */
const SUNSET: ThemePalette = {
  tint: '#e69153',
  swatches: ['#e69153', '#e68d4c', '#2f4c6a', '#452c19'],
  accents: { day: ['#a66637', '#28405a'], night: ['#eeb48a', '#8ba6c2'] },
};

/** The accent colour the interface is painted with right now. */
const accent = () => document.documentElement.style.getPropertyValue('--trip-accent');

describe('Your colours', () => {
  it('survive a refresh on this device', async () => {
    localStorage.setItem(TINT_STORAGE_KEY, JSON.stringify(SUNSET));
    renderApp('/');
    await screen.findByRole('navigation', { name: 'Main' });
    expect(accent()).toBe(SUNSET.accents.day[0]);
  });

  it('ignore a broken saved value', async () => {
    localStorage.setItem(TINT_STORAGE_KEY, '{"tint":"red"}');
    renderApp('/');
    await screen.findByRole('navigation', { name: 'Main' });
    expect(accent()).not.toBe('red');
    expect(accent()).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('come back from your account when you log in on a new device', async () => {
    session.set('u_demo');
    await api.refreshSession();
    await profileApi.update({ theme: SUNSET });
    api.setAccessToken(null);
    renderApp('/');
    await waitFor(() => expect(accent()).toBe(SUNSET.accents.day[0]));
    expect(JSON.parse(localStorage.getItem(TINT_STORAGE_KEY)!)).toEqual(SUNSET);
  });

  it("keep a guest's choice on the account they sign in to", async () => {
    localStorage.setItem(TINT_STORAGE_KEY, JSON.stringify(SUNSET));
    session.set('u_demo');
    renderApp('/');
    await waitFor(async () => {
      await api.refreshSession();
      expect((await profileApi.get()).profile.theme).toEqual(SUNSET);
    });
  });

  it('go back to the region colours on this device when you log out', async () => {
    session.set('u_demo');
    await api.refreshSession();
    await profileApi.update({ theme: SUNSET });
    api.setAccessToken(null);
    const { user } = renderApp('/passport/account');
    await waitFor(() => expect(accent()).toBe(SUNSET.accents.day[0]));
    await user.click(await screen.findByRole('button', { name: /^Log out$/ }));
    await waitFor(() => expect(accent()).not.toBe(SUNSET.accents.day[0]));
    expect(localStorage.getItem(TINT_STORAGE_KEY)).toBeNull();
  });
});
