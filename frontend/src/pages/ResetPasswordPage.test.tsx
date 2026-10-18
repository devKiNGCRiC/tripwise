/**
 * ResetPasswordPage.test.tsx — forgot password (a neutral answer whatever the email) and
 * setting a new password from the emailed link.
 */
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('forgot and reset password', () => {
  it('can be reached from the login page and never says whether an email exists', async () => {
    const { user } = renderApp('/login');
    await user.click(await screen.findByRole('link', { name: 'Forgot password?' }));
    // Wait for the new page (the login page's own Email box is there until it loads).
    await screen.findByRole('heading', { name: 'Forgot your password' });
    await user.type(screen.getByLabelText('Email'), 'someone@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText("If that email has an account, we've sent a reset link")).toBeInTheDocument();
  });

  it('sets a new password from the link', async () => {
    const { user } = renderApp('/reset-password/demo-reset');
    await user.type(await screen.findByLabelText('New password'), 'brandnew123');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByText('Password updated — log in with your new password')).toBeInTheDocument();
    expect(within(screen.getByRole('status')).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  it('explains an expired link', async () => {
    const { user } = renderApp('/reset-password/not-a-real-token');
    await user.type(await screen.findByLabelText('New password'), 'brandnew123');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This reset link has expired. Ask for a new one.');
  });
});
