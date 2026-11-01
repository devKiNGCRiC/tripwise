/**
 * Words.test.tsx — Indian or English names. Toli words read in Hindi/Sanskrit by default; each
 * person can switch to plain English (saved on their account, so it follows them), and switch
 * back from the account's preferences.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** The main navbar. */
const nav = () => screen.findByRole('navigation', { name: 'Main' });
/** The tabs of a Toli page. */
const tabs = () => screen.findByRole('navigation', { name: /sections/ });

describe('Indian or English names', () => {
  beforeEach(() => session.set('u_demo'));

  it('reads in Indian names by default', async () => {
    renderApp('/tolis/t_seed_kerala');
    expect(within(await nav()).getByRole('link', { name: /^Tolis/ })).toBeInTheDocument();
    expect(within(await tabs()).getByRole('link', { name: 'Sahyatris' })).toBeInTheDocument();
  });

  it('switches to English names, saves it on the account and starts that way next time', async () => {
    const { user, unmount } = renderApp('/tolis/t_seed_kerala');
    await user.click(await screen.findByRole('button', { name: 'English names' }));
    expect(within(await nav()).getByRole('link', { name: /^Groups/ })).toBeInTheDocument();
    const sections = await tabs();
    expect(within(sections).getAllByRole('link').map((l) => l.textContent)).toEqual(['Trip', 'Decide', 'Chat', 'Members', 'Activity']);
    expect(screen.getByText(/You’re the Leader/)).toBeInTheDocument();
    await waitFor(() => expect(db.users.find((u) => u.id === 'u_demo')!.preferences.names).toBe('english'));
    unmount();

    // A new device (still signed in): the account's choice arrives with the profile.
    localStorage.removeItem('tripwise:names');
    renderApp('/tolis');
    const fresh = await nav();
    await waitFor(() => expect(within(fresh).getByRole('link', { name: /^Groups/ })).toBeInTheDocument());
  });

  it('switches back to Indian names from the account preferences', async () => {
    db.users.find((u) => u.id === 'u_demo')!.preferences.names = 'english';
    const { user } = renderApp('/passport/account');
    const choice = await screen.findByRole('radiogroup', { name: 'Feature names' });
    await user.click(within(choice).getByRole('radio', { name: /Indian/ }));
    expect(within(await nav()).getByRole('link', { name: /^Tolis/ })).toBeInTheDocument();
    await waitFor(() => expect(db.users.find((u) => u.id === 'u_demo')!.preferences.names).toBe('indian'));
  });
});
