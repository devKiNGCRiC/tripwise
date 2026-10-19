/**
 * RegionGuide.test.tsx — the "month by month" section is a control, not a picture: it
 * opens on this month, any month can be chosen (by click or arrow keys), and the chosen
 * month shows its weather, festivals with dates, which experiences and places are in
 * season (with their best months when they aren't), and links into the planner.
 */
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { regionByKey } from '@/world/regions';
import { RegionGuide } from './RegionGuide';

const sisters = regionByKey('sisters')!;

describe('RegionGuide', () => {
  beforeEach(() => {
    // Only the clock is fake (timers stay real for user events): it's 20 October 2026.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-20T10:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  /** The month buttons. */
  const months = () => within(screen.getByRole('group', { name: 'Months' })).getAllByRole('button');

  it('opens on this month', () => {
    renderWithProviders(<RegionGuide region={sisters} />);
    expect(months()).toHaveLength(12);
    expect(screen.getByRole('button', { name: /^October/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Seven Sisters in October' })).toBeInTheDocument();
  });

  it("shows the chosen month's weather, festivals and what's in season", async () => {
    const { user } = renderWithProviders(<RegionGuide region={sisters} />);
    await user.click(screen.getByRole('button', { name: /^December/ }));
    const panel = screen.getByRole('region', { name: 'Seven Sisters in December' });

    expect(within(panel).getByText('7 to 16°C')).toBeInTheDocument();
    expect(within(panel).getByText(/Shillong · IMD 1991–2020 averages/)).toBeInTheDocument();

    const festivals = within(panel).getByRole('list', { name: 'Festivals' });
    expect(within(festivals).getByText('Hornbill Festival')).toBeInTheDocument();
    expect(within(festivals).getByText('1–10 Dec 2026')).toBeInTheDocument();
    expect(within(festivals).getByRole('link', { name: 'Plan a trip for Hornbill Festival' })).toHaveAttribute(
      'href',
      '/plan?destination=Kohima&start=2026-12-01&end=2026-12-04',
    );

    // Kaziranga is open (Nov–Apr); Tawang is best Mar–Jun and Sep–Oct.
    const experiences = within(panel).getByRole('list', { name: 'Experiences' });
    expect(within(experiences).getByRole('link', { name: 'Plan Kaziranga rhino safari' })).toHaveAttribute('href', '/plan?destination=Kaziranga&month=12');
    expect(within(experiences).getByText('Best Mar–Jun, Sep–Oct')).toBeInTheDocument();
    const places = within(panel).getByRole('list', { name: 'At their best' });
    expect(within(places).getByText('Shillong')).toBeInTheDocument();
    expect(within(places).queryByText('Tawang')).not.toBeInTheDocument();

    expect(within(panel).getByRole('link', { name: 'Plan Seven Sisters for December' })).toHaveAttribute('href', '/plan?destination=Shillong&month=12');
  });

  it('says when a month has no festival listed', async () => {
    const { user } = renderWithProviders(<RegionGuide region={sisters} />);
    await user.click(screen.getByRole('button', { name: /^June/ }));
    expect(within(screen.getByRole('region', { name: 'Seven Sisters in June' })).getByText(/No big festivals/)).toBeInTheDocument();
  });

  it("lists the world's next dated festivals, soonest first, and jumps to their month", async () => {
    const { user } = renderWithProviders(<RegionGuide region={sisters} />);
    const coming = within(screen.getByRole('list', { name: 'Coming up' })).getAllByRole('button');
    expect(coming.map((b) => b.textContent)).toEqual([
      expect.stringContaining('Wangala (100 Drums)'),
      expect.stringContaining('Hornbill Festival'),
      expect.stringContaining('Rongali Bihu'),
    ]);
    await user.click(coming[1]);
    expect(screen.getByRole('button', { name: /^December/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves between months with the arrow keys', async () => {
    const { user } = renderWithProviders(<RegionGuide region={sisters} />);
    await user.click(screen.getByRole('button', { name: /^December/ }));
    await user.keyboard('{ArrowRight}');
    const january = screen.getByRole('button', { name: /^January/ });
    expect(january).toHaveAttribute('aria-pressed', 'true');
    expect(january).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /^December/ })).toHaveFocus();
  });
});
