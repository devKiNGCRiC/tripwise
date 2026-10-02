/**
 * LandingPage.test.tsx — the landing page renders, loads destinations from the API,
 * and the quick "Where to?" box hands off to the planner (via login for guests).
 */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('LandingPage', () => {
  it('shows the hero and popular destinations from the API', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /plan less/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Goa' })).toBeInTheDocument();
  });

  it('sends the quick-plan destination to the planner (through login for guests)', async () => {
    const { user, router } = renderApp('/');
    await user.type(await screen.findByLabelText('Where to?'), 'Goa');
    await user.click(screen.getByRole('button', { name: 'Plan my trip' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/plan?destination=Goa')}`);
  });
});
