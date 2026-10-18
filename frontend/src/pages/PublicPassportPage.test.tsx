/**
 * PublicPassportPage.test.tsx — someone else's passport at /u/:username (as their privacy
 * allows, even logged out when it's public), and joining friends through an invite link.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('public passports', () => {
  it("shows Meera's public passport to a visitor who isn't logged in", async () => {
    renderApp('/u/meera');
    const cover = await screen.findByRole('region', { name: 'Passport cover' });
    expect(within(cover).getByText('Meera Iyer')).toBeInTheDocument();
    const stamps = screen.getByRole('list', { name: 'Stamps' });
    expect(within(stamps).getByRole('img', { name: /Varanasi journal, 4 diyas/ })).toBeInTheDocument();
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
