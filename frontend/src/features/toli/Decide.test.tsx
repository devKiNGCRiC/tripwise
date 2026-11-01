/**
 * Decide.test.tsx — the Decide tab (demo: "Kerala Toli" has a transport poll where Raj
 * voted Train; Raj's and Ananya's private budgets are 2,500–3,500 and 2,000–3,000):
 *   - voting in a poll; leaders closing it
 *   - a Tithi (dates) poll: several picks, the best overlap and who hasn't voted
 *   - a destination poll compared on TripWise's own facts
 *   - budget comfort: my range stays mine; everyone sees only what suits all
 *   - "Plan with TripWise" opens the planner for the Toli, prefilled
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** "YYYY-MM-DD" n days from today (local). */
function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('Decide tab', () => {
  beforeEach(() => session.set('u_demo'));

  it('votes in a poll, and lets the Sutradhar close it', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=decide');
    const poll = await screen.findByRole('article', { name: 'How shall we travel?' });
    await user.click(within(poll).getByRole('radio', { name: /Flight/ }));
    expect(await within(poll).findByText('1 vote', { selector: '[data-option="o2"] *' })).toBeInTheDocument();
    await user.click(within(poll).getByRole('radio', { name: /Train/ }));
    await waitFor(() => expect(within(poll).getByText('2 votes')).toBeInTheDocument());
    await user.click(within(poll).getByRole('button', { name: 'Close poll' }));
    expect(await within(poll).findByText(/Decided: Train/)).toBeInTheDocument();
  });

  it('runs a Tithi poll with several picks, the best overlap and who hasn’t voted', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=decide');
    await user.click(await screen.findByRole('button', { name: 'New poll' }));
    await user.selectOptions(screen.getByLabelText('Kind of poll'), 'tithi');
    const [s1, s2] = screen.getAllByLabelText('From');
    const [e1, e2] = screen.getAllByLabelText('To');
    for (const [input, value] of [[s1, inDays(30)], [e1, inDays(33)], [s2, inDays(40)], [e2, inDays(42)]] as const) {
      await user.clear(input);
      await user.type(input, value);
    }
    await user.click(screen.getByRole('button', { name: 'Create poll' }));
    const poll = await screen.findByRole('article', { name: 'When can you go?' });
    expect(within(poll).getByText(/Raj Roy, Ananya Das and you haven’t voted yet/)).toBeInTheDocument();
    const boxes = within(poll).getAllByRole('checkbox');
    await user.click(boxes[0]);
    await user.click(boxes[1]);
    expect(await within(poll).findByText(/Raj Roy and Ananya Das haven’t voted yet/)).toBeInTheDocument();
  });

  it('compares destinations on TripWise facts', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=decide');
    await user.click(await screen.findByRole('button', { name: 'New poll' }));
    await user.selectOptions(screen.getByLabelText('Kind of poll'), 'destination');
    const [o1, o2] = screen.getAllByLabelText(/^Option/);
    await user.type(o1, 'Hampi');
    await user.type(o2, 'Atlantis');
    await user.click(screen.getByRole('button', { name: 'Create poll' }));
    const poll = await screen.findByRole('article', { name: 'Where shall we go?' });
    expect(within(poll).getByText(/Best Oct – Feb/)).toBeInTheDocument();
    expect(within(poll).getByText(/Virupaksha Temple/)).toBeInTheDocument();
    expect(within(poll).getByText(/Not in TripWise’s catalogue yet/)).toBeInTheDocument();
  });

  it('keeps my budget mine and shows only the range that suits everyone', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=decide');
    const card = await screen.findByRole('region', { name: 'Budget comfort' });
    expect(await within(card).findByText('₹2,500 – ₹3,000 a day suits 2 of 3')).toBeInTheDocument();
    await user.type(within(card).getByLabelText('From (₹ a day)'), '2000');
    await user.type(within(card).getByLabelText('Up to (₹ a day)'), '2800');
    await user.click(within(card).getByRole('button', { name: 'Save my range' }));
    expect(await within(card).findByText('₹2,500 – ₹2,800 a day suits all 3')).toBeInTheDocument();
    expect(within(card).getByText(/Your range \(only you see it\): ₹2,000 – ₹2,800/)).toBeInTheDocument();
    expect(card).not.toHaveTextContent('3,500');
  });

  it('opens the planner for the Toli, prefilled', async () => {
    const { user, router } = renderApp('/tolis/t_seed_kerala?tab=decide');
    await user.click(await screen.findByRole('link', { name: /Plan the Sahyatra with TripWise/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/plan'));
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('toli')).toBe('t_seed_kerala');
    expect(params.get('budget')).toBe('3000');
    expect(await screen.findByText(/Planning the Sahyatra for/)).toHaveTextContent('Planning the Sahyatra for Kerala Toli');
  });
});
