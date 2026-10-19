/**
 * LandingPage.test.tsx — the Seven Worlds homepage: opens on the Himalaya, the region
 * bar switches the whole page, the dossier shows the region's facts and a 12-month chart,
 * the planner hands off to the planner page (through login for guests), traveller cards
 * stay in sync with the hero chips and the planner, the world cards lead to each world's
 * places, "Good to go" shows places at their best this month, and the colour tools live
 * in the navbar rather than on the page.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { seedDestinations } from '@/mocks/data/destinations';
import { renderApp } from '@/test/render';

describe('LandingPage', () => {
  it('the navbar "Seven worlds" link reaches the section from any page, without reloading', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { user, router } = renderApp('/login');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    await user.click(within(nav).getByRole('link', { name: 'Seven worlds' }));
    await waitFor(() => expect(router.state.location.hash).toBe('#worlds'));
    expect(router.state.location.pathname).toBe('/');
    await waitFor(() => expect(scrollIntoView.mock.contexts.some((el) => (el as Element).id === 'worlds')).toBe(true));
  });

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
    const months = within(within(guide).getByRole('group', { name: 'Months' })).getAllByRole('button');
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

  it('each world card leads to its places: Explore filtered to that world, or the planner where none are listed yet', async () => {
    const { user, router } = renderApp('/');
    const worlds = await screen.findByRole('region', { name: /Seven worlds/ });
    const konkan = within(worlds).getByRole('link', { name: /^Konkan & Malabar/ });
    expect(await within(konkan).findByText('2 places')).toBeInTheDocument();
    expect(within(konkan).getByText(/Goa/)).toBeInTheDocument();
    expect(within(worlds).getByRole('link', { name: /^Deccan Plateau/ })).toHaveAttribute('href', '/plan?destination=Hampi');
    await user.click(konkan);
    await waitFor(() => expect(router.state.location.pathname).toBe('/explore'));
    expect(router.state.location.search).toBe('?world=konkan');
  });

  it("shows places at their best this month", async () => {
    renderApp('/');
    const month = new Date().getMonth() + 1;
    const name = new Date().toLocaleString('en-GB', { month: 'long' });
    const section = await screen.findByRole('region', { name: `Good to go in ${name}` });
    const expected = seedDestinations.filter((d) => d.bestMonths.includes(month)).slice(0, 6);
    const cards = await within(section).findAllByRole('link', { name: new RegExp(`^(${expected.map((d) => d.name).join('|')}),`) });
    expect(cards).toHaveLength(expected.length);
    expect(within(section).getByRole('link', { name: /See all/ })).toHaveAttribute('href', `/explore?month=${month}`);
  });

  it('keeps the colour tools out of the page (they live in the navbar)', async () => {
    renderApp('/');
    await screen.findByRole('region', { name: /Seven worlds/ });
    expect(screen.queryByRole('button', { name: 'Choose a photo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colours' })).toBeInTheDocument();
  });
});
