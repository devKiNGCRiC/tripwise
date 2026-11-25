/**
 * TripsPage.test.tsx — My trips for someone with none yet: besides "Plan your first trip", it
 * suggests a few places at their best this month, each a one-tap start in the planner.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('TripsPage, with no trips yet', () => {
  it('suggests places at their best this month, each starting a plan', async () => {
    session.set('u_dev');
    renderApp('/trips');
    expect(await screen.findByText('No trips yet')).toBeInTheDocument();
    const ideas = await screen.findByRole('list', { name: 'Ideas for this month' });
    const links = within(ideas).getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links.length).toBeLessThanOrEqual(4);
    expect(links[0].getAttribute('href')).toMatch(/^\/plan\?destination=/);
  });
});
