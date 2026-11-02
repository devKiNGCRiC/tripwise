/**
 * AdminPage.test.tsx — the admin area on the website (demo admin: Aditi Admin) and reporting:
 *   - travellers who aren't admins see "Admins only"
 *   - Overview counts; Travellers: find and block; Destinations: hide from Explore;
 *     Reports: remove reported content; Log: what admins did
 *   - anyone signed in can report someone else's public passport
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('admin area', () => {
  beforeEach(() => session.set('u_admin'));

  it('is for admins only', async () => {
    session.set('u_demo');
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
  });

  it('shows the overview', async () => {
    renderApp('/admin');
    const overview = await screen.findByRole('region', { name: 'Overview' });
    expect(await within(overview).findByText(`${db.users.length}`)).toBeInTheDocument();
    expect(within(overview).getByText('Travellers')).toBeInTheDocument();
    expect(within(overview).getByRole('list', { name: 'Sign-ups, last 30 days' })).toBeInTheDocument();
  });

  it('finds and blocks a traveller, and the log shows it', async () => {
    const { user } = renderApp('/admin?tab=travellers');
    await user.type(await screen.findByLabelText('Search travellers'), 'meera');
    const row = await screen.findByRole('row', { name: /Meera Iyer/ });
    await user.click(within(row).getByRole('button', { name: 'Block Meera Iyer' }));
    expect(await within(row).findByText('Blocked')).toBeInTheDocument();
    expect(db.users.find((u) => u.id === 'u_meera')!.blocked).toBe(true);
    await user.click(screen.getByRole('link', { name: 'Log' }));
    expect(await screen.findByText(/Aditi Admin · block · Meera Iyer/)).toBeInTheDocument();
  });

  it('hides a destination from Explore', async () => {
    const { user } = renderApp('/admin?tab=destinations');
    const goa = await screen.findByRole('row', { name: /^Goa/ });
    await user.click(within(goa).getByRole('button', { name: 'Hide Goa from Explore' }));
    await waitFor(() => expect(db.hiddenDestinations).toContain('goa'));
    expect(await within(goa).findByRole('button', { name: 'Show Goa in Explore' })).toBeInTheDocument();
  });

  it('removes the content of a reported passport', async () => {
    db.reports.push({ id: 'rp_test', reporterId: 'u_demo', targetId: 'u_meera', reason: 'spam', note: 'Selling things', status: 'open', createdAt: new Date().toISOString() });
    const { user } = renderApp('/admin?tab=reports');
    const report = await screen.findByRole('article', { name: /Meera Iyer/ });
    expect(report).toHaveTextContent('Selling things');
    expect(report).toHaveTextContent('Backpacking India');
    await user.click(within(report).getByRole('button', { name: 'Remove content' }));
    await waitFor(() => expect(db.users.find((u) => u.id === 'u_meera')!.bio).toBe(''));
    await waitFor(() => expect(screen.queryByRole('article', { name: /Meera Iyer/ })).not.toBeInTheDocument());
  });
});

describe('reporting a passport', () => {
  it('lets a traveller report someone else’s public passport', async () => {
    session.set('u_demo');
    const { user } = renderApp('/u/meera');
    await user.click(await screen.findByRole('button', { name: 'Report' }));
    const dialog = await screen.findByRole('dialog', { name: /Report this passport/ });
    await user.selectOptions(within(dialog).getByLabelText('Why?'), 'spam');
    await user.type(within(dialog).getByLabelText('Anything else (optional)'), 'Selling things');
    await user.click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(await screen.findByText(/Thanks — an admin will look at it/)).toBeInTheDocument();
    expect(db.reports[0]).toMatchObject({ reporterId: 'u_demo', targetId: 'u_meera', reason: 'spam', note: 'Selling things' });
  });
});
