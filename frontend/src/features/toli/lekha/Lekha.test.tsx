/**
 * Lekha.test.tsx — the Lekha tab, adding and listing expenses (demo "Kerala Toli": Demo leads
 * with Raj and Ananya; Raj paid the houseboat deposit, Demo the Karimeen lunch, Ananya the auto;
 * Demo's banana chips are personal):
 *   - an expense shared by only some Sahyatris, split equally (shown live) or by amounts
 *   - a personal expense only its owner sees
 *   - without signal an expense waits and is saved once when it's back
 *   - only whoever added an expense (or a leader) can delete it
 */
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { apiUrl } from '@/lib/api/config';
import { db, session } from '@/mocks/db';
import { server } from '@/mocks/node';
import { renderApp } from '@/test/render';

/** The add-an-expense form. */
const form = () => screen.findByRole('region', { name: 'Add an expense' });
/** The list of expenses. */
const list = () => screen.findByRole('list', { name: 'Expenses' });

describe('Lekha — expenses', () => {
  beforeEach(() => session.set('u_demo'));

  it('names the tab and lists the Toli’s expenses', async () => {
    renderApp('/tolis/t_seed_kerala?tab=lekha');
    expect(await screen.findByRole('heading', { name: /^Lekha/ })).toBeInTheDocument();
    expect(screen.getByText(/who paid, who owes/)).toBeInTheDocument();
    const lunch = within(await list()).getByRole('article', { name: /Karimeen lunch/ });
    expect(lunch).toHaveTextContent('₹840');
    expect(lunch).toHaveTextContent(/You paid · shared by you and Ananya Das/);
  });

  it('adds an expense shared by only some, split equally (shown as you go)', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const add = await form();
    await user.type(within(add).getByLabelText('What for'), 'Thali dinner');
    await user.type(within(add).getByLabelText('Amount (₹)'), '600');
    expect(within(add).getByText('₹200 each')).toBeInTheDocument();
    await user.click(within(add).getByRole('checkbox', { name: 'Ananya Das' }));
    expect(within(add).getByText('₹300 each')).toBeInTheDocument();
    await user.click(within(add).getByRole('button', { name: 'Add expense' }));
    const thali = await within(await list()).findByRole('article', { name: /Thali dinner/ });
    expect(thali).toHaveTextContent('₹600');
    expect(thali).toHaveTextContent(/shared by you and Raj Roy/);
    expect(db.toliExpenses.find((e) => e.title === 'Thali dinner')!.parts).toEqual({ u_demo: 30000, u_raj: 30000 });
  });

  it('only adds a by-amounts split once it adds up', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const add = await form();
    await user.type(within(add).getByLabelText('What for'), 'Shopping');
    await user.type(within(add).getByLabelText('Amount (₹)'), '500');
    await user.click(within(add).getByRole('checkbox', { name: 'Ananya Das' }));
    await user.click(within(add).getByRole('radio', { name: 'By amounts' }));
    await user.type(within(add).getByLabelText('Amount for you (₹)'), '400');
    expect(within(add).getByText('₹100 left to assign')).toBeInTheDocument();
    expect(within(add).getByRole('button', { name: 'Add expense' })).toBeDisabled();
    await user.type(within(add).getByLabelText('Amount for Raj Roy (₹)'), '100');
    expect(within(add).getByRole('button', { name: 'Add expense' })).toBeEnabled();
  });

  it('keeps a personal expense to its owner', async () => {
    const { user, unmount } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const chips = within(await list()).getByRole('article', { name: /Banana chips/ });
    expect(chips).toHaveTextContent(/personal · only you see this/);
    const add = await form();
    await user.type(within(add).getByLabelText('What for'), 'Coconut water');
    await user.type(within(add).getByLabelText('Amount (₹)'), '60');
    await user.click(within(add).getByRole('checkbox', { name: /Only for me/ }));
    expect(within(add).queryByRole('checkbox', { name: 'Raj Roy' })).not.toBeInTheDocument();
    await user.click(within(add).getByRole('button', { name: 'Add expense' }));
    await within(await list()).findByRole('article', { name: /Coconut water/ });
    unmount();

    session.set('u_ananya');
    renderApp('/tolis/t_seed_kerala?tab=lekha');
    await within(await list()).findByRole('article', { name: /Karimeen lunch/ });
    expect(screen.queryByText(/Banana chips|Coconut water/)).not.toBeInTheDocument();
  });

  it('keeps an expense waiting without signal and saves it once when back', async () => {
    server.use(http.post(apiUrl('/tolis/:id/expenses'), () => HttpResponse.error()));
    const { user } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const add = await form();
    await user.type(within(add).getByLabelText('What for'), 'Boat tickets');
    await user.type(within(add).getByLabelText('Amount (₹)'), '450');
    await user.click(within(add).getByRole('button', { name: 'Add expense' }));
    expect(await screen.findByText(/Waiting for signal/)).toBeInTheDocument();
    server.resetHandlers();
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(db.toliExpenses.filter((e) => e.title === 'Boat tickets')).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText(/Waiting for signal/)).not.toBeInTheDocument());
  });

  it('lets only whoever added it (or a leader) delete an expense', async () => {
    session.set('u_ananya');
    const { unmount } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const lunch = within(await list()).getByRole('article', { name: /Karimeen lunch/ });
    expect(within(lunch).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    const auto = within(await list()).getByRole('article', { name: /Auto to the jetty/ });
    expect(within(auto).getByRole('button', { name: 'Delete Auto to the jetty' })).toBeInTheDocument();
    unmount();

    session.set('u_demo');
    const { user } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const mine = within(await list()).getByRole('article', { name: /Karimeen lunch/ });
    await user.click(within(mine).getByRole('button', { name: 'Delete Karimeen lunch' }));
    await waitFor(() => expect(db.toliExpenses.find((e) => e.title === 'Karimeen lunch')!.deletedAt).toBeTruthy());
  });
});
