/**
 * SharedTripPage.test.tsx — sharing a trip: Share copies a public /t/ link (with a
 * "Link copied" toast), anyone can open it without logging in and sees the plan but
 * none of the owner's buttons, unknown links say so kindly, and Download PDF hands the
 * trip to the PDF maker.
 */
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { itinerariesApi } from '@/lib/api/endpoints';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

// The real PDF maker is heavy and needs a browser; check it's called with the trip.
const downloadPdf = vi.fn();
vi.mock('@/features/trips/pdf/downloadPdf', () => ({ downloadPdf: (...args: unknown[]) => downloadPdf(...args) }));

/** Plan a Goa trip for the demo user. */
async function planGoa() {
  session.set('u_demo');
  await api.refreshSession();
  const { itinerary } = await itinerariesApi.generate({
    destination: 'Goa',
    startDate: '2026-12-12',
    endDate: '2026-12-13',
    budget: { amount: 3000, currency: 'INR' },
    travellers: 'friends',
    interests: ['food'],
    pace: 'chill',
  });
  return itinerary;
}

describe('sharing a trip', () => {
  beforeEach(() => downloadPdf.mockClear());

  it('copies a public link that opens read-only for anyone', async () => {
    const trip = await planGoa();
    const { user, unmount } = renderApp(`/trips/${trip.id}`);
    await user.click(await screen.findByRole('button', { name: 'Share' }));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    const link = await navigator.clipboard.readText();
    expect(link).toMatch(/\/t\/sh_/);
    unmount();

    // A friend, not logged in, opens it.
    api.setAccessToken(null);
    session.clear();
    renderApp(new URL(link).pathname);
    expect(await screen.findByRole('heading', { level: 1, name: trip.title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete trip' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Regenerate day/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan your own trip' })).toHaveAttribute('href', '/plan?destination=Goa');
  });

  it('says so when a shared link is not available', async () => {
    renderApp('/t/sh_unknown');
    expect(await screen.findByRole('heading', { name: "This shared trip isn't available" })).toBeInTheDocument();
  });

  it('downloads the trip as a PDF', async () => {
    const trip = await planGoa();
    const { user } = renderApp(`/trips/${trip.id}`);
    await user.click(await screen.findByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(downloadPdf).toHaveBeenCalledWith(expect.objectContaining({ id: trip.id })));
  });
});
