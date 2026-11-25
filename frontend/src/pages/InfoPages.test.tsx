/**
 * InfoPages.test.tsx — the pages a public site needs: About, Privacy, Terms and Contact.
 *   - each opens at its own address with its own heading and tab title
 *   - Contact gives the email as a mail link
 *   - the footer links to all four; sign-up says creating an account accepts Terms and Privacy
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BRAND } from '@/lib/brand';
import { renderApp } from '@/test/render';

/** Each page: its address, its main heading and the tab title. */
const PAGES = [
  { path: '/about', heading: 'About TripWise', title: 'About · TripWise' },
  { path: '/privacy', heading: 'Privacy policy', title: 'Privacy · TripWise' },
  { path: '/terms', heading: 'Terms of use', title: 'Terms · TripWise' },
  { path: '/contact', heading: 'Contact us', title: 'Contact · TripWise' },
];

describe('info pages', () => {
  it.each(PAGES)('opens $path with its heading and title', async ({ path, heading, title }) => {
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(document.title).toBe(title);
  });

  it('gives the contact email as a mail link', async () => {
    renderApp('/contact');
    const link = await screen.findByRole('link', { name: BRAND.email });
    expect(link).toHaveAttribute('href', `mailto:${BRAND.email}`);
  });

  it('privacy explains location sharing and deleting your account', async () => {
    renderApp('/privacy');
    expect(await screen.findByRole('heading', { name: /location/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /delet/i })).toBeInTheDocument();
  });

  it('lists its sections in an "On this page" menu that jumps to each', async () => {
    renderApp('/privacy');
    const menu = await screen.findByRole('navigation', { name: 'On this page' });
    expect(within(menu).getByRole('link', { name: 'Your location' })).toHaveAttribute('href', '#your-location');
    expect(within(menu).getAllByRole('link').length).toBeGreaterThanOrEqual(8);
    expect(screen.getByRole('region', { name: 'Your location' })).toHaveAttribute('id', 'your-location');
  });

  it('links all four from the footer', async () => {
    renderApp('/explore');
    const footer = await screen.findByRole('navigation', { name: 'About TripWise' });
    for (const [name, href] of [['About', '/about'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['Contact', '/contact']]) {
      expect(within(footer).getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('sign-up says an account accepts the Terms and Privacy policy', async () => {
    renderApp('/signup');
    // Inside the form itself (the footer has its own Terms link).
    const form = (await screen.findByRole('button', { name: 'Create account' })).closest('form')!;
    expect(within(form).getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(within(form).getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy');
  });
});
