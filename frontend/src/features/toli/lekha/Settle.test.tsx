/**
 * Settle.test.tsx — balances, settling up and totals on the Lekha tab (demo "Kerala Toli":
 * Raj paid ₹3,600 for all three, Demo ₹840 for Demo and Ananya, Ananya ₹450 for all three;
 * Demo's ₹250 banana chips are personal; Raj saved UPI ID king@okicici):
 *   - each Sahyatri's balance (worked out here with the shared rules, not typed in twice)
 *   - the fewest payments; Pay with UPI only for the payer, when the payee has a UPI ID
 *   - marking a payment settled moves it to the payments-back list
 *   - totals, with my personal spending shown only to me, and TripWise's estimate
 *   - sharing a UPI ID on the Sahyatris tab
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { balances, formatRupees } from '@lekha-rules';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** Everyone's net in the seeded Kerala Toli, from the shared rules. */
function seededNet() {
  const group = db.toliExpenses.filter((e) => e.toliId === 't_seed_kerala' && !e.personal && !e.deletedAt);
  return balances(group, []);
}

describe('Lekha — settling up', () => {
  beforeEach(() => session.set('u_demo'));

  it('shows each Sahyatri’s balance', async () => {
    const net = seededNet();
    renderApp('/tolis/t_seed_kerala?tab=lekha');
    const list = await screen.findByRole('list', { name: 'Balances' });
    expect(within(list).getByText(`Raj Roy gets back ${formatRupees(net.u_raj)}`)).toBeInTheDocument();
    expect(within(list).getByText(`You owe ${formatRupees(-net.u_demo)}`)).toBeInTheDocument();
    expect(within(list).getByText(`Ananya Das owes ${formatRupees(-net.u_ananya)}`)).toBeInTheDocument();
  });

  it('offers Pay with UPI to the payer only, and Mark settled to anyone', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const settle = await screen.findByRole('list', { name: 'To settle up' });
    const mine = within(settle).getByRole('listitem', { name: /You pay Raj Roy ₹930/ });
    expect(within(mine).getByRole('link', { name: 'Pay with UPI' }).getAttribute('href')).toMatch(/^upi:\/\/pay\?pa=king%40okicici&pn=Raj%20Roy&am=930\.00/);
    const ananyas = within(settle).getByRole('listitem', { name: /Ananya Das pays Raj Roy ₹1,320/ });
    expect(within(ananyas).queryByRole('link', { name: 'Pay with UPI' })).not.toBeInTheDocument();
    await user.click(within(ananyas).getByRole('button', { name: 'Mark settled' }));
    await waitFor(() => expect(within(settle).queryByRole('listitem', { name: /Ananya Das pays/ })).not.toBeInTheDocument());
    const paid = await screen.findByRole('list', { name: 'Payments back' });
    expect(within(paid).getByText(/Ananya Das paid Raj Roy ₹1,320/)).toBeInTheDocument();
    expect(db.toliSettlements).toEqual([expect.objectContaining({ from: 'u_ananya', to: 'u_raj', amount: 132000, method: 'cash', recordedBy: 'u_demo' })]);
  });

  it('records a UPI payment as UPI after Pay with UPI', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const mine = within(await screen.findByRole('list', { name: 'To settle up' })).getByRole('listitem', { name: /You pay Raj Roy/ });
    // Opening the UPI app is the phone's job; here we only need the click to be remembered.
    const link = within(mine).getByRole('link', { name: 'Pay with UPI' });
    link.addEventListener('click', (e) => e.preventDefault());
    await user.click(link);
    await user.click(within(mine).getByRole('button', { name: 'Mark settled' }));
    await waitFor(() => expect(db.toliSettlements[0]).toMatchObject({ from: 'u_demo', to: 'u_raj', method: 'upi' }));
  });

  it('shows totals, my personal spending only to me, and TripWise’s estimate', async () => {
    const { unmount } = renderApp('/tolis/t_seed_kerala?tab=lekha');
    const totals = await screen.findByRole('region', { name: 'Totals' });
    expect(within(totals).getByText(/Trip total ₹4,890/)).toBeInTheDocument();
    expect(within(totals).getByText(/Your trip so far: ₹1,770 shared \+ ₹250 personal \(only you see this\)/)).toBeInTheDocument();
    expect(within(totals).getByText(/TripWise estimated/)).toBeInTheDocument();
    unmount();

    session.set('u_ananya');
    renderApp('/tolis/t_seed_kerala?tab=lekha');
    const hers = await screen.findByRole('region', { name: 'Totals' });
    expect(within(hers).getByText(/Your trip so far: ₹1,770 shared/)).toBeInTheDocument();
    expect(hers).not.toHaveTextContent('₹250 personal');
  });

  it('lets a Sahyatri share a UPI ID with the Toli', async () => {
    session.set('u_ananya');
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatris');
    const box = await screen.findByLabelText('Your UPI ID (only this Toli sees it)');
    await user.type(box, 'nope');
    await user.click(screen.getByRole('button', { name: 'Save UPI ID' }));
    expect(await screen.findByText(/doesn’t look like a UPI ID/)).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, 'ananya@oksbi');
    await user.click(screen.getByRole('button', { name: 'Save UPI ID' }));
    await waitFor(() => expect(db.tolis.find((t) => t.id === 't_seed_kerala')!.members.find((m) => m.userId === 'u_ananya')!.upi).toBe('ananya@oksbi'));
    expect(await screen.findByText(/ananya@oksbi/)).toBeInTheDocument();
  });
});
