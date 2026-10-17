/**
 * LandingPage.test.tsx — the Seven Worlds homepage: opens on the Himalaya, the region
 * bar and the world cards switch the whole page, the dossier shows the region's facts
 * and a 12-month chart, the planner hands off to the planner page (through login for
 * guests), traveller cards stay in sync with the hero chips and the planner, and the
 * personalisation controls are there.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('LandingPage', () => {
  it('opens on the Himalaya', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Where the mountains keep time\./ })).toBeInTheDocument();
  });

  it('switches the whole page from the region bar', async () => {
    const { user } = renderApp('/');
    const bar = await screen.findByRole('navigation', { name: 'Regions' });
    await user.click(within(bar).getByRole('button', { name: /^Thar/ }));
    expect(screen.getByRole('heading', { level: 1, name: /Where the sand remembers kings\./ })).toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: 'Region dossier' })).getByText('150–300 m')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /^Thar/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it("shows a real photo of the region in the dossier, credited, and swaps it with the region", async () => {
    const { user } = renderApp('/');
    const dossier = await screen.findByRole('complementary', { name: 'Region dossier' });
    expect(within(dossier).getByRole('img', { name: /Valley of Flowers/ })).toHaveAttribute('src', '/regions/himalaya.jpg');
    expect(within(dossier).getByRole('link', { name: /Photo: .*CC BY-SA 4\.0/ })).toHaveAttribute('href', expect.stringContaining('commons.wikimedia.org'));

    await user.click(within(screen.getByRole('navigation', { name: 'Regions' })).getByRole('button', { name: /^Deccan Plateau/ }));
    expect(within(dossier).getByRole('img', { name: /Hampi/ })).toHaveAttribute('src', '/regions/deccan.jpg');
  });

  it('keeps the first screen light: the month chart and experiences live in the region guide below', async () => {
    renderApp('/');
    const dossier = await screen.findByRole('complementary', { name: 'Region dossier' });
    expect(within(dossier).queryByRole('list', { name: 'When to go' })).not.toBeInTheDocument();
    expect(within(dossier).getByRole('link', { name: /When to go & what to do/ })).toHaveAttribute('href', '#region-guide');

    const guide = screen.getByRole('region', { name: /Himalaya guide/ });
    const months = within(within(guide).getByRole('list', { name: 'When to go' })).getAllByRole('listitem');
    expect(months).toHaveLength(12);
    expect(months.map((m) => m.textContent)).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    expect(months.filter((m) => m.getAttribute('aria-current') === 'date')).toHaveLength(1);
    expect(within(guide).getByText('Valley of Flowers trek')).toBeInTheDocument();
  });

  it('sends the planned destination to the planner (through login for guests)', async () => {
    const { user, router } = renderApp('/');
    await user.type(await screen.findByLabelText('Where do you want to go?'), 'Goa');
    await user.click(screen.getByRole('button', { name: 'Plan' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/plan?destination=Goa')}`);
  });

  it('keeps traveller cards, hero chips and the planner in step', async () => {
    const { user } = renderApp('/');
    const kinds = await screen.findByRole('region', { name: /However you travel/ });
    await user.click(within(kinds).getByRole('button', { name: /^Family/ }));
    expect(within(kinds).getByRole('button', { name: /^Family/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: "Who's travelling" })).getByRole('button', { name: 'Family' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText("Who's going")).toHaveValue('Family');
  });

  it('switches the world from the "Seven worlds" cards', async () => {
    const { user } = renderApp('/');
    const worlds = await screen.findByRole('region', { name: /Seven worlds/ });
    await user.click(within(worlds).getByRole('button', { name: /^Konkan & Malabar/ }));
    expect(screen.getByRole('heading', { level: 1, name: /Where the sun clocks out late\./ })).toBeInTheDocument();
  });

  it('offers photo colours and location', async () => {
    renderApp('/');
    expect(await screen.findByRole('button', { name: 'Choose a photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument();
  });
});
