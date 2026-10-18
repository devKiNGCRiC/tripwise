/**
 * FriendsPage.test.tsx — friends: answering requests, adding people by @username, the
 * invite link, and the requests badge in the navbar.
 */
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('FriendsPage', () => {
  beforeEach(() => session.set('u_demo'));

  it('lists friends and lets you accept a request', async () => {
    const { user } = renderApp('/passport/friends');
    const friends = await screen.findByRole('region', { name: 'Friends' });
    expect(await within(friends).findByText('Kabir Shah')).toBeInTheDocument();
    const requests = screen.getByRole('region', { name: 'Requests' });
    expect(within(requests).getByText('Zoya Khan')).toBeInTheDocument();
    await user.click(within(requests).getByRole('button', { name: 'Accept Zoya Khan' }));
    expect(await within(friends).findByText('Zoya Khan')).toBeInTheDocument();
  });

  it('finds people by exact @username and sends a request', async () => {
    const { user } = renderApp('/passport/friends');
    const find = await screen.findByRole('region', { name: 'Add by username' });
    await user.type(within(find).getByLabelText('Username'), '@meera');
    await user.click(within(find).getByRole('button', { name: 'Find' }));
    expect(await within(find).findByText('Meera Iyer')).toBeInTheDocument();
    await user.click(within(find).getByRole('button', { name: 'Send request' }));
    expect(await within(find).findByText('Request sent')).toBeInTheDocument();

    await user.clear(within(find).getByLabelText('Username'));
    await user.type(within(find).getByLabelText('Username'), 'nobody_here');
    await user.click(within(find).getByRole('button', { name: 'Find' }));
    expect(await within(find).findByRole('alert')).toHaveTextContent('No traveller with that username');
  });

  it('shows your invite link', async () => {
    renderApp('/passport/friends');
    const invite = await screen.findByRole('region', { name: 'Invite link' });
    expect(await within(invite).findByText(/\/join\/demoJOIN01$/)).toBeInTheDocument();
  });

  it('shows waiting requests in the navbar', async () => {
    renderApp('/');
    expect(await screen.findByLabelText('Your passport (1 friend request)')).toBeInTheDocument();
  });
});
