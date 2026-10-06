/**
 * LandingPage.test.tsx — "The Descent" landing page: six stages over the scenery,
 * the departure-board hero, destination postcards from the API, the three steps
 * in order, the AI and crew sections, and the quick-plan hand-off to the planner.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('LandingPage', () => {
  it('lays the page out as the six stages of the descent over the scenery', async () => {
    const { container } = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: /planned day by day/i });
    expect([...container.querySelectorAll('[data-descent-stage]')].map((el) => el.getAttribute('data-descent-stage'))).toEqual([
      'Sky',
      'Glacier',
      'Mountains',
      'Waterfall',
      'River',
      'Land',
    ]);
    expect(container.querySelector('[data-stage="0"]')).not.toBeNull(); // photo scenery (jsdom has no WebGL)
    expect(screen.getByText('9,000 m')).toBeInTheDocument(); // altitude meter
  });

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

  it('explains the AI planner and the crew features', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Ideas pour in. The plan comes out.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Better with your crew' })).toBeInTheDocument();
  });

  it('sends the quick-plan destination to the planner (through login for guests)', async () => {
    const { user, router } = renderApp('/');
    await user.type(await screen.findByLabelText('Where do you want to go?'), 'Goa');
    await user.click(screen.getByRole('button', { name: 'Plan my trip' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/plan?destination=Goa')}`);
  });
});
