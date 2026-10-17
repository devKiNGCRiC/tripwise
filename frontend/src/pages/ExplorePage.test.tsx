/**
 * ExplorePage.test.tsx — browsing destinations: all of them by default, filters that
 * narrow the list and live in the URL (shareable, back-button friendly), search, a
 * friendly empty state, and the destination guide with its "Plan a trip here" link.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

/** The destination links in the results grid. */
async function results() {
  const grid = await screen.findByRole('list', { name: 'Destinations' });
  return within(grid).queryAllByRole('link');
}

describe('ExplorePage', () => {
  it('lists every destination at first', async () => {
    renderApp('/explore');
    await waitFor(async () => expect(await results()).toHaveLength(12));
    expect(screen.getByRole('heading', { level: 1, name: /Explore/ })).toBeInTheDocument();
  });

  it('narrows by vibe and keeps the filter in the address', async () => {
    const { user, router } = renderApp('/explore');
    await waitFor(async () => expect(await results()).toHaveLength(12));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Vibe' }), 'beach');
    await waitFor(() => expect(router.state.location.search).toContain('vibe=beach'));
    await waitFor(async () => {
      const names = (await results()).map((a) => a.getAttribute('aria-label'));
      expect(names.length).toBeGreaterThan(0);
      expect(names.length).toBeLessThan(12);
      expect(names.some((n) => n?.startsWith('Goa'))).toBe(true);
    });
  });

  it('keeps every filter in one compact bar above the results', async () => {
    renderApp('/explore');
    const bar = await screen.findByRole('search', { name: 'Filter destinations' });
    for (const name of ['Vibe', 'Budget', 'Best month']) expect(within(bar).getByRole('combobox', { name })).toBeInTheDocument();
    expect(within(bar).getByRole('group', { name: 'World' })).toBeInTheDocument();
  });

  it('filters by world (one of the seven regions)', async () => {
    const { user } = renderApp('/explore');
    await waitFor(async () => expect(await results()).toHaveLength(12));
    await user.click(within(screen.getByRole('group', { name: 'World' })).getByRole('button', { name: 'Himalaya' }));
    await waitFor(async () => expect((await results()).map((a) => a.getAttribute('aria-label')?.split(',')[0]).sort()).toEqual(['Ladakh', 'Manali']));
  });

  it('searches by name', async () => {
    const { user } = renderApp('/explore');
    await user.type(await screen.findByRole('searchbox', { name: 'Search destinations' }), 'jai');
    await waitFor(async () => expect((await results()).map((a) => a.getAttribute('aria-label')?.split(',')[0])).toEqual(['Jaipur']));
  });

  it('shows a friendly empty state and clears filters', async () => {
    const { user } = renderApp('/explore?q=atlantis');
    expect(await screen.findByText('No places match those filters.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(async () => expect(await results()).toHaveLength(12));
  });
});

describe('DestinationPage', () => {
  it('shows the guide and a "Plan a trip here" link', async () => {
    renderApp('/destinations/goa');
    expect(await screen.findByRole('heading', { level: 1, name: /Goa/ })).toBeInTheDocument();
    expect(screen.getByText('गोवा')).toHaveAttribute('lang', 'hi');
    expect(screen.getByRole('link', { name: 'Plan a trip here' })).toHaveAttribute('href', '/plan?destination=Goa');
    expect(within(screen.getByRole('list', { name: 'Best months' })).getAllByRole('listitem')).toHaveLength(12);
  });

  it('says so when a destination does not exist', async () => {
    renderApp('/destinations/nowhere');
    expect(await screen.findByRole('heading', { name: 'Destination not found' })).toBeInTheDocument();
  });

  it('clears the search when the address changes from outside (e.g. the navbar link)', async () => {
    const { router } = renderApp('/explore?q=goa');
    const box = await screen.findByRole('searchbox', { name: 'Search destinations' });
    expect(box).toHaveValue('goa');
    await router.navigate('/explore');
    await waitFor(() => expect(box).toHaveValue(''));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(router.state.location.search).toBe('');
  });
});
