/**
 * LandingPage.test.tsx — the landing page renders its departure-board hero,
 * loads destination postcards (with Hindi names) from the API, explains the
 * three steps in order, and hands the quick-plan box off to the planner.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('LandingPage', () => {
  it('shows the hero headline and the departure board', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /planned day by day/i })).toBeInTheDocument();
    expect(screen.getByText(/^Next stop: Goa/)).toBeInTheDocument();
  });

  it('shows destination postcards from the API with their local names', async () => {
    renderApp('/');
    const goa = await screen.findByRole('link', { name: /goa/i });
    expect(within(goa).getByText('गोवा')).toBeInTheDocument();
  });

  it('lists the three planning steps in order', async () => {
    renderApp('/');
    const steps = await screen.findByRole('list', { name: 'How TripWise works' });
    expect(within(steps).getAllByRole('listitem').map((li) => within(li).getByRole('heading').textContent)).toEqual([
      'Pick your vibe',
      'AI plans every day',
      'Save, share, go',
    ]);
  });

  it('sends the quick-plan destination to the planner (through login for guests)', async () => {
    const { user, router } = renderApp('/');
    await user.type(await screen.findByLabelText('Where do you want to go?'), 'Goa');
    await user.click(screen.getByRole('button', { name: 'Plan my trip' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/plan?destination=Goa')}`);
  });
});
