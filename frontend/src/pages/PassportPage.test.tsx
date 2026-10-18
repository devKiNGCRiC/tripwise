/**
 * PassportPage.test.tsx — the passport shows the traveller's details, a stamp for every
 * planned trip, today's AI plan allowance, and the Motion setting: travellers can choose Calm (everything holds still) or Full;
 * the choice is remembered and applied to the page.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { api } from '@/lib/api/client';
import { itinerariesApi } from '@/lib/api/endpoints';
import { session } from '@/mocks/db';
import { MOTION_STORAGE_KEY } from '@/lib/motionPreference';
import { renderApp } from '@/test/render';

describe('PassportPage', () => {
  it("shows the traveller's details on the cover", async () => {
    session.set('u_dev');
    renderApp('/passport');
    const cover = await screen.findByRole('region', { name: 'Passport cover' });
    expect(within(cover).getByText('dev@tripwise.app')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No stamps yet' })).toBeInTheDocument();
  });

  it('collects a stamp for each trip and shows the plans left today', async () => {
    session.set('u_dev');
    await api.refreshSession();
    const { itinerary } = await itinerariesApi.generate({
      destination: 'Goa',
      startDate: '2026-12-12',
      endDate: '2026-12-13',
      budget: { amount: 3000, currency: 'INR' },
      travellers: 'solo',
      interests: ['food'],
      pace: 'chill',
    });
    renderApp('/passport');
    const stamps = await screen.findByRole('list', { name: 'Stamps' });
    const stamp = within(stamps).getByRole('link', { name: /Goa/ });
    expect(stamp).toHaveAttribute('href', `/trips/${itinerary.id}`);
    expect(within(stamp).getByText('गोवा')).toBeInTheDocument();
    expect(await screen.findByText('4 of 5 AI plans left today')).toBeInTheDocument();
    const stats = screen.getByRole('list', { name: 'Travel stats' });
    expect(within(stats).getByText('Trips planned').previousSibling).toHaveTextContent('1');
    expect(within(stats).getByText('Worlds explored').previousSibling).toHaveTextContent('1');
    expect(within(stats).getByText('Days on the road').previousSibling).toHaveTextContent('2');
  });

  it('starts on Full motion and remembers Calm', async () => {
    session.set('u_dev');
    const { user } = renderApp('/passport');
    expect(await screen.findByRole('radio', { name: /full/i })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: /calm/i }));
    expect(screen.getByRole('radio', { name: /calm/i })).toBeChecked();
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('calm');
    expect(document.documentElement.dataset.motion).toBe('calm');

    await user.click(screen.getByRole('radio', { name: /full/i }));
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
  });
});
