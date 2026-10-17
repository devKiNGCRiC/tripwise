/**
 * LandingPage.test.tsx — the Monsoon Editorial homepage: the editorial hero over the
 * liquid photographs (with its slide index), destination cards from the API with their Hindi names, the three
 * steps in order, the sample itinerary and crew sections, and the quick-plan hand-off
 * to the planner (with quick-pick chips).
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('LandingPage', () => {
  it('shows the editorial hero over the liquid photographs', async () => {
    const { container } = renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /India, unhurried\./ })).toBeInTheDocument();
    expect(screen.getByText('यात्रा, बिना झंझट')).toHaveAttribute('lang', 'hi');
    // jsdom has no WebGL, so the plain photo stand-ins carry the hero.
    expect(container.querySelectorAll('section img[src*="images.unsplash.com"]').length).toBeGreaterThanOrEqual(4);
  });

  it('visits each place from the slide index', async () => {
    const { user } = renderApp('/');
    const places = await screen.findByRole('group', { name: 'Choose a place' });
    expect(within(places).getByRole('button', { name: 'Show Varanasi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('वाराणसी', { selector: '[aria-live]' })).toBeInTheDocument();

    await user.click(within(places).getByRole('button', { name: 'Show Ladakh' }));
    expect(within(places).getByRole('button', { name: 'Show Ladakh' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('लद्दाख', { selector: '[aria-live]' })).toBeInTheDocument();
  });

  it('shows destination cards from the API with their local names', async () => {
    renderApp('/');
    const goa = await screen.findByRole('link', { name: /^goa/i });
    expect(within(goa).getByText('गोवा')).toBeInTheDocument();
  });

  it('lists the three planning steps in order', async () => {
    renderApp('/');
    const steps = await screen.findByRole('list', { name: 'How TripWise works' });
    expect(within(steps).getAllByRole('listitem').map((li) => within(li).getByRole('heading').textContent)).toEqual([
      'Choose your pace',
      'Watch it take shape',
      'Share and set off',
    ]);
  });

  it('shows a sample itinerary and the crew preview', async () => {
    renderApp('/');
    const sample = await screen.findByRole('article', { name: 'Sample itinerary for Udaipur' });
    expect(within(sample).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Better with your crew' })).toBeInTheDocument();
  });

  it('sends the quick-plan destination to the planner (through login for guests)', async () => {
    const { user, router } = renderApp('/');
    await user.type(await screen.findByLabelText('Where do you want to go?'), 'Goa');
    await user.click(screen.getByRole('button', { name: 'Plan my journey' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/plan?destination=Goa')}`);
  });

  it('fills the destination from a quick-pick chip', async () => {
    const { user } = renderApp('/');
    const picks = await screen.findByRole('group', { name: 'Popular picks' });
    await user.click(within(picks).getByRole('button', { name: 'Ladakh' }));
    expect(screen.getByLabelText('Where do you want to go?')).toHaveValue('Ladakh');
    expect(within(picks).getByRole('button', { name: 'Ladakh' })).toHaveAttribute('aria-pressed', 'true');
  });
});
