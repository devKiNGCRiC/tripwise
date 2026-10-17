/**
 * TripPage.test.tsx — a planned trip reads like a real itinerary (timed days, transfers
 * between stops, costs in ₹), one day can be regenerated on its own, a trip can be
 * deleted (after confirming), unknown trips say so, and My trips lists what's planned.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { api } from '@/lib/api/client';
import { apiUrl } from '@/lib/api/config';
import { itinerariesApi } from '@/lib/api/endpoints';
import type { Itinerary } from '@/lib/api/types';
import { session } from '@/mocks/db';
import { server } from '@/mocks/node';
import { renderApp } from '@/test/render';

/** Plan a 3-day Goa trip for the demo user straight through the mock API. */
async function planGoa(): Promise<Itinerary> {
  session.set('u_demo');
  await api.refreshSession();
  const { itinerary } = await itinerariesApi.generate({
    destination: 'Goa',
    startDate: '2026-12-12',
    endDate: '2026-12-14',
    budget: { amount: 3000, currency: 'INR' },
    travellers: 'couple',
    interests: ['food'],
    pace: 'balanced',
  });
  return itinerary;
}

describe('TripPage', () => {
  beforeEach(() => session.set('u_demo'));

  it('shows each day as a timed plan with transfers and costs', async () => {
    const trip = await planGoa();
    renderApp(`/trips/${trip.id}`);
    expect(await screen.findByRole('heading', { level: 1, name: trip.title })).toBeInTheDocument();
    const days = screen.getAllByRole('region', { name: /^Day \d/ });
    expect(days).toHaveLength(3);
    const first = trip.days[0].activities[0];
    expect(within(days[0]).getByText(first.startTime!)).toBeInTheDocument();
    expect(within(days[0]).getByText(new RegExp(`${first.transfer!.minutes} min`))).toBeInTheDocument();
    expect(screen.getByText(`₹${trip.estimatedCost.total.toLocaleString('en-IN')}`)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Packing list' })).toBeInTheDocument();
  });

  it('regenerates a single day', async () => {
    const trip = await planGoa();
    const { user } = renderApp(`/trips/${trip.id}`);
    const day2 = await screen.findByRole('region', { name: /^Day 2/ });
    const before = day2.textContent;
    await user.click(within(day2).getByRole('button', { name: 'Regenerate day 2' }));
    await waitFor(() => expect(screen.getByRole('region', { name: /^Day 2/ }).textContent).not.toBe(before));
    expect(screen.getByRole('region', { name: /^Day 1/ }).textContent).toContain(trip.days[0].activities[0].title);
  });

  it('deletes a trip after confirming', async () => {
    const trip = await planGoa();
    const { user, router } = renderApp(`/trips/${trip.id}`);
    await user.click(await screen.findByRole('button', { name: 'Delete trip' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete this trip?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/trips'));
    expect(await screen.findByText('No trips yet')).toBeInTheDocument();
  });

  it('says so when a trip does not exist', async () => {
    renderApp('/trips/it_missing');
    expect(await screen.findByRole('heading', { name: 'Trip not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to my trips' })).toHaveAttribute('href', '/trips');
  });
});

describe('TripsPage', () => {
  beforeEach(() => session.set('u_demo'));

  it('starts empty, then lists planned trips', async () => {
    const first = renderApp('/trips');
    expect(await screen.findByText('No trips yet')).toBeInTheDocument();
    first.unmount();

    const trip = await planGoa();
    renderApp('/trips');
    const card = await screen.findByRole('link', { name: new RegExp(trip.title) });
    expect(card).toHaveAttribute('href', `/trips/${trip.id}`);
  });

  it('offers a retry when the trip fails to load (not a missing trip)', async () => {
    server.use(http.get(apiUrl('/itineraries/:id'), () => HttpResponse.json({ error: { code: 'SERVER', message: 'Oops' } }, { status: 500 })));
    renderApp('/trips/it_any');
    expect(await screen.findByRole('heading', { name: "We couldn't load this trip" }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('says so when deleting fails', async () => {
    const trip = await planGoa();
    server.use(http.delete(apiUrl('/itineraries/:id'), () => HttpResponse.json({ error: { code: 'SERVER', message: 'Oops' } }, { status: 500 })));
    const { user } = renderApp(`/trips/${trip.id}`);
    await user.click(await screen.findByRole('button', { name: 'Delete trip' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete this trip?' })).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText("Couldn't delete the trip — try again.")).toBeInTheDocument();
  });
});
