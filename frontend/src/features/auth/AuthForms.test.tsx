/**
 * AuthForms.test.tsx — login/signup forms: validation, server errors, success redirect.
 */
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

/** Mount a form at its route plus simple landing pages so redirects are visible. */
function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route path="/passport" element={<h1>Passport page</h1>} />
      <Route path="/plan" element={<h1>Planner page</h1>} />
    </Routes>,
    { route },
  );
}

describe('LoginForm', () => {
  it('validates the email before calling the server', async () => {
    const { user } = renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('shows the server message for a wrong password', async () => {
    const { user } = renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'demo@tripwise.app');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('logs in and follows a safe ?next= path', async () => {
    const { user } = renderAt('/login?next=%2Fplan');
    await user.type(screen.getByLabelText('Email'), 'demo@tripwise.app');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Planner page' })).toBeInTheDocument();
  });
});

describe('SignupForm', () => {
  it('requires a password of at least 8 characters', async () => {
    const { user } = renderAt('/signup');
    await user.type(screen.getByLabelText('Your name'), 'Riya');
    await user.type(screen.getByLabelText('Email'), 'riya@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument();
  });

  it('creates an account and lands on the passport page', async () => {
    const { user } = renderAt('/signup');
    await user.type(screen.getByLabelText('Your name'), 'Riya Sharma');
    await user.type(screen.getByLabelText('Email'), 'riya@example.com');
    await user.type(screen.getByLabelText('Password'), 'wanderlust1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Passport page' })).toBeInTheDocument();
  });

  it('tells you when the email is already registered', async () => {
    const { user } = renderAt('/signup');
    await user.type(screen.getByLabelText('Your name'), 'Demo Again');
    await user.type(screen.getByLabelText('Email'), 'demo@tripwise.app');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
