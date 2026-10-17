/**
 * PlannerWizard.test.tsx — the trip planner: pre-fill from the URL, step-by-step
 * validation (destination, dates, interests), the happy path to a generated trip, and
 * the two failure modes the AI can hit — daily quota used up, and both AIs busy —
 * where the traveller's answers must survive.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** "YYYY-MM-DD" for today + n days (local time). */
function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Set a date input (typing into date fields is unreliable in the test DOM). */
const setDate = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
/** Press Next. */
const next = (user: ReturnType<typeof renderApp>['user']) => user.click(screen.getByRole('button', { name: 'Next' }));

/** Walk the wizard from the destination step to the review step with valid answers. */
async function fillAll(user: ReturnType<typeof renderApp>['user'], destination = 'Goa') {
  const where = await screen.findByLabelText('Destination');
  await user.clear(where);
  await user.type(where, destination);
  await next(user);
  setDate('Start date', inDays(10));
  setDate('End date', inDays(12));
  await next(user);
  await user.click(screen.getByRole('radio', { name: /Couple/ }));
  await next(user);
  await user.click(within(screen.getByRole('group', { name: 'Interests' })).getByRole('button', { name: 'Food' }));
  await next(user);
  await user.click(screen.getByRole('radio', { name: /Balanced/ }));
  await next(user);
  await screen.findByRole('heading', { name: 'Ready when you are' });
}

describe('PlannerWizard', () => {
  beforeEach(() => session.set('u_demo'));

  it('pre-fills the destination from the address', async () => {
    renderApp('/plan?destination=Goa');
    expect(await screen.findByLabelText('Destination')).toHaveValue('Goa');
  });

  it('asks for a destination before moving on', async () => {
    const { user } = renderApp('/plan');
    await screen.findByLabelText('Destination');
    await next(user);
    expect(await screen.findByText('Where would you like to go?')).toBeInTheDocument();
  });

  it('checks the dates', async () => {
    const { user } = renderApp('/plan?destination=Goa');
    await screen.findByLabelText('Destination');
    await next(user);
    setDate('Start date', inDays(10));
    setDate('End date', inDays(8));
    await next(user);
    expect(await screen.findByText('End date must be on or after the start date')).toBeInTheDocument();
    setDate('End date', inDays(25));
    await next(user);
    expect(await screen.findByText('Trips can be up to 14 days')).toBeInTheDocument();
  });

  it('needs at least one interest', async () => {
    const { user } = renderApp('/plan?destination=Goa');
    await screen.findByLabelText('Destination');
    await next(user);
    setDate('Start date', inDays(10));
    setDate('End date', inDays(11));
    await next(user);
    await next(user);
    await screen.findByRole('group', { name: 'Interests' });
    await next(user);
    expect(await screen.findByText('Pick at least one interest')).toBeInTheDocument();
  });

  it('generates the trip and opens it', async () => {
    const { user, router } = renderApp('/plan');
    await fillAll(user);
    expect(screen.getByText('Goa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate my trip' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/trips\/it_/));
  });

  it('explains the daily limit and keeps the answers', async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    db.generations.u_demo = { day: today, used: 5 };
    const { user } = renderApp('/plan');
    await fillAll(user);
    await user.click(screen.getByRole('button', { name: 'Generate my trip' }));
    const dialog = await screen.findByRole('dialog', { name: "You've planned 5 trips today" });
    expect(dialog).toHaveTextContent(/resets/i);
    await user.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('heading', { name: 'Ready when you are' })).toBeInTheDocument();
    expect(screen.getByText('Goa')).toBeInTheDocument();
  });

  it('offers a retry when both AI planners are busy', async () => {
    const { user } = renderApp('/plan');
    await fillAll(user, 'fail-ai');
    await user.click(screen.getByRole('button', { name: 'Generate my trip' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Both AI planners are busy');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('still checks the dates when the budget box is empty', async () => {
    const { user } = renderApp('/plan?destination=Goa');
    await screen.findByLabelText('Destination');
    await next(user);
    setDate('Start date', inDays(10));
    setDate('End date', inDays(11));
    await next(user);
    await user.clear(screen.getByLabelText('Budget per person per day (₹)'));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    setDate('Start date', '2020-01-01');
    await next(user);
    expect(await screen.findByText("Start date can't be in the past")).toBeInTheDocument();
  });

  it('keeps the AI-busy retry on the review step only', async () => {
    const { user } = renderApp('/plan');
    await fillAll(user, 'fail-ai');
    await user.click(screen.getByRole('button', { name: 'Generate my trip' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
