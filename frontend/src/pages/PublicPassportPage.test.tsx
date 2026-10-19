/**
 * PublicPassportPage.test.tsx — someone else's passport at /u/:username (as their privacy
 * allows, even logged out when it's public), wearing the owner's colours only while there
 * (never saved as yours), and joining friends through an invite link.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import { db, session } from '@/mocks/db';
import { server } from '@/mocks/node';
import { renderApp } from '@/test/render';
import { TINT_STORAGE_KEY } from '@/world/WorldProvider';

describe('public passports', () => {
  it("shows Meera's public passport to a visitor who isn't logged in", async () => {
    renderApp('/u/meera');
    const cover = await screen.findByRole('region', { name: 'Passport cover' });
    expect(within(cover).getByText('Meera Iyer')).toBeInTheDocument();
    const stamps = screen.getByRole('list', { name: 'Stamps' });
    expect(within(stamps).getByRole('img', { name: /Varanasi journal, 4 diyas/ })).toBeInTheDocument();
  });

  it("wears the owner's colours while there, without saving them as yours", async () => {
    const meera = db.users.find((u) => u.username === 'meera')!;
    meera.theme = { tint: '#e69153', swatches: ['#e69153', '#e68d4c', '#2f4c6a', '#452c19'], accents: { day: ['#a66637', '#28405a'], night: ['#eeb48a', '#8ba6c2'] } };
    renderApp('/u/meera');
    await screen.findByRole('region', { name: 'Passport cover' });
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--trip-accent')).toBe('#a66637'));
    expect(localStorage.getItem(TINT_STORAGE_KEY)).toBeNull();
  });

  it("keeps Kabir's passport private from visitors", async () => {
    renderApp('/u/kabir');
    expect(await screen.findByRole('heading', { name: 'This passport is private' })).toBeInTheDocument();
  });

  it('lets friends see it, with a Friends badge', async () => {
    session.set('u_demo');
    renderApp('/u/kabir');
    const cover = await screen.findByRole('region', { name: 'Passport cover' });
    expect(within(cover).getByText('Friends ✓')).toBeInTheDocument();
  });

  it('waits for a slow login restore before deciding (a friend is not shown "private")', async () => {
    session.set('u_demo');
    // On a real network the login comes back after the page has started loading.
    server.use(
      http.post(apiUrl('/auth/refresh'), async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return HttpResponse.json({ accessToken: 'mock-access.u_demo' });
      }),
    );
    renderApp('/u/kabir');
    expect(await screen.findByRole('region', { name: 'Passport cover' })).toBeInTheDocument();
  });
});

describe('invite links', () => {
  it('makes you friends after one click', async () => {
    session.set('u_demo');
    const { user, router } = renderApp('/join/meeraJOIN1');
    expect(await screen.findByText('Meera Iyer')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Become friends' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/passport/friends'));
    expect(await screen.findByText('You and Meera Iyer are now friends')).toBeInTheDocument();
  });
});
