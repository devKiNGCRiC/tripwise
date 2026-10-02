/**
 * AuthProvider.test.tsx — session bootstrap, login and logout.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';
import { useAuth } from './AuthProvider';

/** Shows auth state as text and exposes login/logout buttons. */
function AuthProbe() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <p>status: {status}</p>
      <p>user: {user?.name ?? 'none'}</p>
      <button type="button" onClick={() => login({ email: 'demo@tripwise.app', password: 'password123' })}>
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('starts as guest when there is no session', async () => {
    renderWithProviders(<AuthProbe />);
    expect(await screen.findByText('status: guest')).toBeInTheDocument();
  });

  it('restores an existing session on load', async () => {
    session.set('u_demo');
    renderWithProviders(<AuthProbe />);
    expect(await screen.findByText('user: Demo Traveller')).toBeInTheDocument();
    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
  });

  it('logs in and out', async () => {
    const { user } = renderWithProviders(<AuthProbe />);
    await screen.findByText('status: guest');

    await user.click(screen.getByRole('button', { name: 'login' }));
    expect(await screen.findByText('user: Demo Traveller')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'logout' }));
    expect(await screen.findByText('status: guest')).toBeInTheDocument();
    expect(session.get()).toBeNull();
  });
});
