/**
 * PassportPage.test.tsx — the new passport: the cover (photo, @username, bio, type and
 * numbers), the seven worlds with the next one to unlock, Yatra marks, and the visa pages
 * whose stamps open trip journals ("How was Jaipur?" → diyas and a memory).
 */
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { http } from 'msw';
import { apiUrl } from '@/lib/api/config';
import { session } from '@/mocks/db';
import { server } from '@/mocks/node';
import { renderApp } from '@/test/render';

describe('PassportPage', () => {
  beforeEach(() => session.set('u_demo'));

  it('shows the cover with @username, bio, type and numbers', async () => {
    renderApp('/passport');
    const cover = await screen.findByRole('region', { name: 'Passport cover' });
    expect(within(cover).getByText('Demo Traveller')).toBeInTheDocument();
    expect(within(cover).getByText('@demotraveller')).toBeInTheDocument();
    expect(within(cover).getByText(/Always hunting the best thali/)).toBeInTheDocument();
    expect(within(cover).getByText('Foodie')).toBeInTheDocument();
    expect(within(cover).getByText('Pune')).toBeInTheDocument();
    const stats = within(cover).getByRole('list', { name: 'Travel stats' });
    expect(within(stats).getByText('Trips').previousSibling).toHaveTextContent('2');
    expect(within(stats).getByText('Worlds').previousSibling).toHaveTextContent('2/7');
    expect(within(cover).getByRole('link', { name: 'Edit profile' })).toHaveAttribute('href', '/passport/account');
    expect(within(cover).getByRole('link', { name: /Friends/ })).toHaveAttribute('href', '/passport/friends');
  });

  it('lights the worlds visited and suggests the next one', async () => {
    renderApp('/passport');
    const worlds = await screen.findByRole('region', { name: 'Your seven worlds' });
    const items = within(worlds).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    expect(within(worlds).getByRole('listitem', { name: 'Konkan & Malabar: visited' })).toBeInTheDocument();
    expect(within(worlds).getByRole('listitem', { name: 'Thar: visited' })).toBeInTheDocument();
    expect(within(worlds).getByRole('listitem', { name: 'Himalaya: not yet' })).toBeInTheDocument();
    expect(within(worlds).getByText(/^Next to unlock: /)).toBeInTheDocument();
  });

  it('shows earned and waiting Yatra marks', async () => {
    renderApp('/passport');
    const marks = await screen.findByRole('region', { name: 'Yatra marks' });
    expect(within(marks).getByRole('listitem', { name: /First steps, earned/ })).toBeInTheDocument();
    expect(within(marks).getByRole('listitem', { name: /Storyteller, not yet: Write 3 trip memories/ })).toBeInTheDocument();
  });

  it('stamps finished trips, shows the upcoming one, and opens a journal from the prompt', async () => {
    const { user } = renderApp('/passport');
    const pages = await screen.findByRole('region', { name: 'Visa pages' });
    const stamps = within(pages).getByRole('list', { name: 'Stamps' });
    expect(within(stamps).getByRole('button', { name: /Goa journal/ })).toBeInTheDocument();
    expect(within(stamps).getByRole('link', { name: /Kerala Backwaters, in \d+ days/ })).toBeInTheDocument();

    await user.click(within(pages).getByRole('button', { name: 'How was Jaipur?' }));
    const sheet = await screen.findByRole('dialog', { name: 'Jaipur journal' });
    await user.click(within(sheet).getByRole('radio', { name: '4 diyas' }));
    await user.type(within(sheet).getByLabelText('Your memory'), 'Lassi at Lassiwala, sunset at Nahargarh.');
    await user.click(within(sheet).getByRole('button', { name: 'Save memory' }));
    expect(await screen.findByText('Memory saved')).toBeInTheDocument();
    expect(await within(stamps).findByRole('button', { name: /Jaipur journal, 4 diyas/ })).toBeInTheDocument();
  });

  it('only shows the journal form once the saved journal has loaded (nothing typed gets wiped)', async () => {
    // A slow network: the journal arrives a moment after the sheet opens.
    server.use(
      http.get(apiUrl('/itineraries/:id/journal'), async () => {
        // Wait, then let the normal demo handler answer (returning nothing falls through).
        await new Promise((resolve) => setTimeout(resolve, 300));
      }),
    );
    const { user } = renderApp('/passport');
    const stamps = await screen.findByRole('list', { name: 'Stamps' });
    await user.click(within(stamps).getByRole('button', { name: /Goa journal/ }));
    const sheet = await screen.findByRole('dialog', { name: 'Goa journal' });
    expect(within(sheet).queryByLabelText('Your memory')).toBeNull();
    expect(await within(sheet).findByLabelText('Your memory')).toHaveValue(
      'Sunsets at Palolem, bebinca at every café and an evening in Fontainhas we will never forget.',
    );
    expect(within(sheet).getByRole('radio', { name: '5 diyas' })).toBeChecked();
    // Its photos load in an <img> (signed for the viewer).
    expect(within(sheet).getAllByRole('img')[0].getAttribute('src')).toMatch(/^\/api\/photos\/ph_seed_goa_1\?v=u_demo/);
  });

  it('has a side column with the next trip, friends and the latest memory', async () => {
    const { user } = renderApp('/passport');
    const next = await screen.findByRole('region', { name: 'Next trip' });
    expect(await within(next).findByText('Kerala Backwaters')).toBeInTheDocument();
    expect(within(next).getByText(/In \d+ days/)).toBeInTheDocument();

    const friends = screen.getByRole('region', { name: 'Your friends' });
    expect(await within(friends).findByText('Kabir Shah')).toBeInTheDocument();
    await user.click(within(friends).getByRole('button', { name: 'Accept Zoya Khan' }));
    expect(await within(friends).findByText('Zoya Khan')).toBeInTheDocument();
    expect(within(friends).queryByRole('button', { name: 'Accept Zoya Khan' })).toBeNull();

    const memory = screen.getByRole('region', { name: 'Latest memory' });
    expect(await within(memory).findByText(/Sunsets at Palolem/)).toBeInTheDocument();
  });

  it("still shows today's AI plan allowance", async () => {
    renderApp('/passport');
    expect(await screen.findByText(/of 5 AI plans left today/)).toBeInTheDocument();
  });
});
