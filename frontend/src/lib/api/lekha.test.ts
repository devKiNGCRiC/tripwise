/**
 * lekha.test.ts — a Toli's money through the API client, served by the demo mock (which does
 * its maths with the API's own `@lekha-rules`). Seeded "Kerala Toli": Raj paid the ₹3,600
 * houseboat deposit for all three; Demo the ₹840 lunch for Demo and Ananya; Ananya the ₹450
 * auto for all three; Demo's ₹250 banana chips are personal. Raj saved UPI ID king@okicici.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { balances } from '@lekha-rules';
import { session } from '@/mocks/db';
import { api } from './client';
import { accountApi, toliApi } from './endpoints';

/** Log in as someone (mock session). */
async function loginAs(userId: string) {
  session.set(userId);
  await api.refreshSession();
}

const KERALA = 't_seed_kerala';

describe('Lekha (demo mock)', () => {
  beforeEach(() => loginAs('u_demo'));

  it('shows balances that add up, the fewest payments and Raj’s UPI link', async () => {
    const { lekha } = await toliApi.lekha(KERALA);
    const net = Object.fromEntries(lekha.balances.map((b) => [b.person.id, b.net]));
    expect(net).toEqual({ u_raj: 225000, u_demo: -93000, u_ananya: -132000 });
    // The same answer as the shared rules give for the seeded expenses.
    const { expenses } = await toliApi.expenses(KERALA);
    const group = expenses.filter((e) => !e.personal).map((e) => ({ paidBy: e.paidBy.id, parts: Object.fromEntries(e.shares.map((s) => [s.person.id, s.amount])) }));
    expect(balances(group, [])).toEqual(net);
    expect(lekha.settleUp.map((p) => [p.from.id, p.to.id, p.amount])).toEqual([
      ['u_ananya', 'u_raj', 132000],
      ['u_demo', 'u_raj', 93000],
    ]);
    expect(lekha.settleUp[1].upiLink).toBe('upi://pay?pa=king%40okicici&pn=Raj%20Roy&am=930.00&cu=INR&tn=Kerala%20Toli%20%C2%B7%20TripWise');
    expect(lekha.totals.mine).toEqual({ share: 177000, personal: 25000, total: 202000 });
  });

  it('keeps Demo’s personal expense from everyone else', async () => {
    expect((await toliApi.expenses(KERALA)).expenses.map((e) => e.title)).toContain('Banana chips');
    await loginAs('u_ananya');
    expect(JSON.stringify(await toliApi.expenses(KERALA))).not.toContain('Banana chips');
    expect((await toliApi.lekha(KERALA)).lekha.totals.mine.personal).toBe(0);
  });

  it('refuses amounts that don’t add up, and saves an offline retry once', async () => {
    const base = { title: 'Thali', amount: 60000, category: 'food' as const, method: 'cash' as const };
    await expect(toliApi.addExpense(KERALA, { ...base, clientId: 'x1', split: { kind: 'amounts', amounts: { u_demo: 40000, u_raj: 10000 } } })).rejects.toMatchObject({ code: 'VALIDATION' });
    const first = await toliApi.addExpense(KERALA, { ...base, clientId: 'x2', split: { kind: 'equal', among: ['u_demo', 'u_raj'] } });
    const again = await toliApi.addExpense(KERALA, { ...base, clientId: 'x2', split: { kind: 'equal', among: ['u_demo', 'u_raj'] } });
    expect(again.expense.id).toBe(first.expense.id);
    expect((await toliApi.expenses(KERALA)).expenses.filter((e) => e.title === 'Thali')).toHaveLength(1);
  });

  it('clears a payment once it’s recorded', async () => {
    await toliApi.settle(KERALA, { clientId: 's1', from: 'u_demo', to: 'u_raj', amount: 93000, method: 'upi' });
    const { lekha } = await toliApi.lekha(KERALA);
    expect(lekha.settleUp.map((p) => p.from.id)).toEqual(['u_ananya']);
    expect(lekha.settlements[0]).toMatchObject({ from: { id: 'u_demo' }, to: { id: 'u_raj' }, amount: 93000, method: 'upi' });
  });

  it('refuses to delete an account until its owner settles up and hands over the Sutradhar role', async () => {
    // Demo leads "Kerala Toli" (and owes Raj): the Sutradhar role comes first.
    await expect(accountApi.deleteAccount('password123')).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringMatching(/Sutradhar.*Kerala Toli|Kerala Toli.*Sutradhar/) });
    // Ananya owes Raj ₹1,320 in Kerala Toli.
    await loginAs('u_ananya');
    await expect(accountApi.deleteAccount('password123')).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringMatching(/Settle up first/) });
  });

  it('keeps someone who still owes from leaving, and saves a UPI ID', async () => {
    await loginAs('u_ananya');
    await expect(toliApi.removeMember(KERALA, 'u_ananya')).rejects.toMatchObject({ code: 'CONFLICT' });
    const { toli } = await toliApi.setMe(KERALA, { upi: 'ananya@oksbi' });
    expect(toli.me.upi).toBe('ananya@oksbi');
    await expect(toliApi.setMe(KERALA, { upi: 'nope' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
