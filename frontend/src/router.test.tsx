/**
 * router.test.tsx — route guards and fallbacks, tested through the real app routes.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('routing', () => {
  it('sends guests from a protected page to login, remembering where they were going', async () => {
    const { router } = renderApp('/trips');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Ftrips');
  });

  it('lets a logged-in user into a protected page', async () => {
    session.set('u_demo');
    renderApp('/trips');
    expect(await screen.findByRole('heading', { name: 'My trips' })).toBeInTheDocument();
  });

  it('blocks non-admins from /admin', async () => {
    session.set('u_demo');
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
  });

  it('lets admins into /admin', async () => {
    session.set('u_admin');
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('redirects logged-in users away from /login', async () => {
    session.set('u_demo');
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/passport'));
    expect(await screen.findByRole('region', { name: 'Passport cover' })).toBeInTheDocument();
  });

  it('shows the lost-luggage page for unknown URLs', async () => {
    renderApp('/this/does/not/exist');
    expect(await screen.findByRole('heading', { name: 'Lost luggage' })).toBeInTheDocument();
  });

  it('lets visitors jump to the seven worlds from the navbar', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Seven worlds' })).toHaveAttribute('href', '/#worlds');
  });

  it('keeps the skip link readable in both themes (text colour follows the ink pill)', async () => {
    renderApp('/');
    const skip = await screen.findByRole('link', { name: 'Skip to content' });
    expect(skip.className).toContain('focus:text-on-ink');
    expect(skip.className).not.toContain('focus:text-white');
  });

  it('logs out from the Account tab', async () => {
    session.set('u_demo');
    const { user, router } = renderApp('/passport/account');
    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
