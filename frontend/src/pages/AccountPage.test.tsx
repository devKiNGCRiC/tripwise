/**
 * AccountPage.test.tsx — the Account tab: editing the profile (and the username rule),
 * privacy, and deleting the account with its password.
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { profileApi } from '@/lib/api/endpoints';
import { MOTION_STORAGE_KEY } from '@/lib/motionPreference';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('AccountPage', () => {
  beforeEach(() => session.set('u_demo'));

  it('shows the profile and saves changes', async () => {
    const { user } = renderApp('/passport/account');
    const profile = await screen.findByRole('region', { name: 'Profile' });
    const bio = within(profile).getByLabelText('Bio');
    expect(bio).toHaveValue('Chai, mountains and slow mornings. Always hunting the best thali in town.');
    await user.clear(bio);
    await user.type(bio, 'Trains over planes.');
    await user.selectOptions(within(profile).getByLabelText('Type of traveller'), 'backpacker');
    await user.click(within(profile).getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    const saved = await profileApi.get();
    expect(saved.profile).toMatchObject({ bio: 'Trains over planes.', travellerType: 'backpacker' });
  });

  it('says when a username is taken', async () => {
    const { user } = renderApp('/passport/account');
    const profile = await screen.findByRole('region', { name: 'Profile' });
    const username = within(profile).getByLabelText('Username');
    await user.clear(username);
    await user.type(username, 'meera');
    await user.click(within(profile).getByRole('button', { name: 'Save profile' }));
    expect(await within(profile).findByRole('alert')).toHaveTextContent('That username is taken');
  });

  it('saves who can see the passport', async () => {
    const { user } = renderApp('/passport/account');
    const privacy = await screen.findByRole('region', { name: 'Privacy' });
    await user.click(within(privacy).getByRole('radio', { name: /Only me/ }));
    await user.click(within(privacy).getByRole('button', { name: 'Save privacy' }));
    expect(await screen.findByText('Privacy saved')).toBeInTheDocument();
    expect((await profileApi.get()).profile.privacy.passport).toBe('private');
  });

  it('starts on Full motion and remembers Calm', async () => {
    const { user } = renderApp('/passport/account');
    expect(await screen.findByRole('radio', { name: /full/i })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /calm/i }));
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBe('calm');
    expect(document.documentElement.dataset.motion).toBe('calm');
    await user.click(screen.getByRole('radio', { name: /full/i }));
    expect(localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
  });

  it('deletes the account only with the right password', async () => {
    const { user, router } = renderApp('/passport/account');
    const danger = await screen.findByRole('region', { name: 'Danger zone' });
    await user.type(within(danger).getByLabelText('Your password'), 'not-my-password');
    await user.click(within(danger).getByRole('button', { name: 'Delete my account' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete forever' }));
    expect(await within(danger).findByRole('alert')).toHaveTextContent("That password isn't right");

    await user.clear(within(danger).getByLabelText('Your password'));
    await user.type(within(danger).getByLabelText('Your password'), 'password123');
    await user.click(within(danger).getByRole('button', { name: 'Delete my account' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete forever' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByText('Your account and data have been deleted')).toBeInTheDocument();
  });
});
