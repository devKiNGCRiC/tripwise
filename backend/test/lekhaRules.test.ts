/**
 * lekhaRules.test.ts — the Toli's money maths, shared by the API and the website's demo mock.
 * Everything is in whole paise and must add up exactly:
 *   splitExpense  equal / by amounts / by shares, leftover paise handed out fairly
 *   balances      who gets money back and who owes (always summing to 0)
 *   settleUp      the fewest payments that clear everyone
 *   totals        the trip total, by category and per person
 *   toPaise / formatRupees / isUpiId / upiLink
 */
import { describe, expect, it } from 'vitest';
import { balances, formatRupees, isUpiId, settleUp, splitExpense, toPaise, totals, upiLink } from '../src/services/lekhaRules.js';

/** Sum of a record's values. */
const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe('splitExpense', () => {
  it('splits equally, giving the leftover paise to the first sharers', () => {
    expect(splitExpense(10000, { kind: 'equal', among: ['a', 'b', 'c'] })).toEqual({ ok: true, parts: { a: 3334, b: 3333, c: 3333 } });
  });

  it('counts a sharer listed twice only once', () => {
    expect(splitExpense(900, { kind: 'equal', among: ['a', 'b', 'a'] })).toEqual({ ok: true, parts: { a: 450, b: 450 } });
  });

  it('takes custom amounts only when they add up exactly', () => {
    expect(splitExpense(1000, { kind: 'amounts', amounts: { a: 600, b: 400 } })).toEqual({ ok: true, parts: { a: 600, b: 400 } });
    expect(splitExpense(1001, { kind: 'amounts', amounts: { a: 600, b: 400 } })).toEqual({ ok: false, reason: 'mismatch' });
    expect(splitExpense(1000, { kind: 'amounts', amounts: { a: 1000, b: 0 } })).toEqual({ ok: true, parts: { a: 1000 } });
  });

  it('splits by shares with fair rounding', () => {
    expect(splitExpense(1001, { kind: 'shares', shares: { a: 1, b: 2 } })).toEqual({ ok: true, parts: { a: 334, b: 667 } });
    expect(splitExpense(1000, { kind: 'shares', shares: { a: 0, b: 2 } })).toEqual({ ok: false, reason: 'bad-share' });
    expect(splitExpense(1000, { kind: 'shares', shares: { a: 1.5, b: 2 } })).toEqual({ ok: false, reason: 'bad-share' });
    expect(splitExpense(1000, { kind: 'shares', shares: { a: 101 } })).toEqual({ ok: false, reason: 'bad-share' });
  });

  it('refuses nobody to share with', () => {
    expect(splitExpense(1000, { kind: 'equal', among: [] })).toEqual({ ok: false, reason: 'empty' });
    expect(splitExpense(1000, { kind: 'shares', shares: {} })).toEqual({ ok: false, reason: 'empty' });
    expect(splitExpense(1000, { kind: 'amounts', amounts: {} })).toEqual({ ok: false, reason: 'empty' });
  });

  it('always adds up to the paisa (equal and shares, many amounts)', () => {
    const people = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    for (let i = 0; i < 200; i++) {
      const amount = 1 + ((i * 7919) % 500000);
      const n = 1 + (i % 7);
      const equal = splitExpense(amount, { kind: 'equal', among: people.slice(0, n) });
      const shares = splitExpense(amount, { kind: 'shares', shares: Object.fromEntries(people.slice(0, n).map((p, j) => [p, 1 + ((i + j) % 5)])) });
      expect(equal.ok && sum(equal.parts)).toBe(amount);
      expect(shares.ok && sum(shares.parts)).toBe(amount);
    }
  });
});

describe('balances and settling up', () => {
  it('nets what each paid against what each shared, and counts settlements', () => {
    const expenses = [{ paidBy: 'raj', parts: { raj: 300, ananya: 300, demo: 300 } }];
    expect(balances(expenses, [])).toEqual({ raj: 600, ananya: -300, demo: -300 });
    const after = balances(expenses, [{ from: 'ananya', to: 'raj', amount: 300 }]);
    expect(after).toEqual({ raj: 300, ananya: 0, demo: -300 });
    expect(sum(after)).toBe(0);
  });

  it('finds the fewest payments', () => {
    expect(settleUp({ a: -500, b: -300, c: 800 })).toEqual([
      { from: 'a', to: 'c', amount: 500 },
      { from: 'b', to: 'c', amount: 300 },
    ]);
    expect(settleUp({ a: 0, b: 0 })).toEqual([]);
  });

  it('clears everyone exactly (applying its payments leaves all at 0)', () => {
    const net = { a: -1234, b: 777, c: -1, d: 458 };
    const payments = settleUp(net);
    const after = balances([], payments);
    for (const [id, value] of Object.entries(net)) expect((after[id] ?? 0) + value).toBe(0);
  });
});

describe('totals', () => {
  it('adds up the trip, by category (every category present) and per person', () => {
    const t = totals([
      { amount: 900, category: 'food', parts: { a: 450, b: 450 } },
      { amount: 300, category: 'transport', parts: { a: 100, b: 100, c: 100 } },
    ]);
    expect(t.total).toBe(1200);
    expect(t.byCategory).toEqual({ stay: 0, food: 900, transport: 300, tickets: 0, shopping: 0, other: 0 });
    expect(t.perPerson).toEqual({ a: 550, b: 550, c: 100 });
  });
});

describe('rupees and UPI', () => {
  it('reads rupees typed as text into paise', () => {
    expect(toPaise('12')).toBe(1200);
    expect(toPaise('12.5')).toBe(1250);
    expect(toPaise('12.50')).toBe(1250);
    expect(toPaise('1,200.75')).toBe(120075);
    expect(toPaise(' 640 ')).toBe(64000);
    for (const bad of ['12.345', '-5', 'abc', '', '.', '1.2.3']) expect(toPaise(bad)).toBeNull();
  });

  it('writes paise as rupees, Indian style', () => {
    expect(formatRupees(10000000)).toBe('₹1,00,000');
    expect(formatRupees(64000)).toBe('₹640');
    expect(formatRupees(120075)).toBe('₹1,200.75');
    expect(formatRupees(5)).toBe('₹0.05');
    expect(formatRupees(-25000)).toBe('-₹250');
  });

  it('checks UPI IDs and builds a pay link', () => {
    expect(isUpiId('raj@okicici')).toBe(true);
    expect(isUpiId('raj.roy-1@ybl')).toBe(true);
    for (const bad of ['raj', 'raj@', '@okicici', 'raj@ok icici']) expect(isUpiId(bad)).toBe(false);
    expect(upiLink({ upi: 'raj@okicici', name: 'Raj Roy', amount: 64000, note: 'Kerala Toli' })).toBe('upi://pay?pa=raj%40okicici&pn=Raj%20Roy&am=640.00&cu=INR&tn=Kerala%20Toli');
  });
});
