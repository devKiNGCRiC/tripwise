/**
 * lekha.ts (mock) — a Toli's money for demo mode: expenses (group and personal), settlements
 * and the Lekha summary. Same routes, shapes and error codes as the real API; all the maths
 * comes from the API's own `lekhaRules.ts` (`@lekha-rules`), never re-written here.
 * Personal expenses are only ever shown to their owner.
 */
import { http, HttpResponse } from 'msw';
import { CATEGORIES, settleUp, splitExpense, totals, upiLink, type Split } from '@lekha-rules';
import { isLeader } from '@toli-rules';
import { apiUrl } from '@/lib/api/config';
import type { LekhaSummary, NewExpense, NewSettlement, Settlement, ToliExpense } from '@/lib/api/types';
import type { MockExpense, MockSettlement, MockToli } from '../data/tolis';
import { db } from '../db';
import { errorResponse } from './shared';
import { asMember, personOf, toliNet } from './tolis';

/** The biggest single expense (₹5,00,000), in paise. */
const MAX_AMOUNT = 50_000_000;
/** Why a split was refused, in words (as the API says it). */
const SPLIT_PROBLEM = { empty: 'Choose who shared it.', mismatch: 'The amounts should add up to the total.', 'bad-share': 'Shares are whole numbers from 1 to 100.' } as const;

/** Small unique ids. */
let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;
/** 400 for a bad request. */
const invalid = (message: string) => errorResponse(400, 'VALIDATION', message);
/** Add an event to the activity feed. */
const logEvent = (toliId: string, actorId: string, type: string, data: Record<string, unknown>) =>
  db.toliEvents.push({ id: newId('ev'), toliId, actorId, type, data, at: new Date().toISOString() });
/** A whole number of paise within limits. */
const goodAmount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= MAX_AMOUNT;

/** An expense as `viewerId` sees it. */
function expenseView(e: MockExpense, viewerId: string, leads: boolean): ToliExpense {
  return {
    id: e.id,
    title: e.title,
    amount: e.amount,
    category: e.category,
    method: e.method,
    ...(e.day ? { day: e.day } : {}),
    personal: e.personal,
    paidBy: personOf(e.paidBy),
    shares: Object.entries(e.parts).map(([id, amount]) => ({ person: personOf(id), amount })),
    addedBy: personOf(e.addedBy),
    canDelete: e.personal || e.addedBy === viewerId || leads,
    createdAt: e.createdAt,
  };
}

/** A settlement as members see it. */
function settlementView(s: MockSettlement): Settlement {
  return { id: s.id, from: personOf(s.from), to: personOf(s.to), amount: s.amount, method: s.method, recordedBy: personOf(s.recordedBy), createdAt: s.createdAt };
}

/** Everything the Lekha tab shows, as `viewerId` sees it. */
function lekhaSummary(toli: MockToli, viewerId: string): LekhaSummary {
  const net = toliNet(toli.id);
  const memberIds = toli.members.map((m) => m.userId);
  const group = db.toliExpenses.filter((e) => e.toliId === toli.id && !e.personal && !e.deletedAt);
  const t = totals(group);
  const personal = db.toliExpenses.filter((e) => e.toliId === toli.id && e.personal && e.addedBy === viewerId && !e.deletedAt).reduce((sum, e) => sum + e.amount, 0);
  const trip = toli.tripId ? db.itineraries.find((i) => i.id === toli.tripId) : undefined;
  const upiOf = new Map(toli.members.flatMap((m) => (m.upi ? [[m.userId, m.upi] as const] : [])));
  const share = t.perPerson[viewerId] ?? 0;
  return {
    balances: memberIds.map((id) => ({ person: personOf(id), net: net[id] ?? 0 })).sort((a, b) => b.net - a.net || a.person.name.localeCompare(b.person.name)),
    settleUp: settleUp(net).map((p) => {
      const upi = upiOf.get(p.to);
      return { from: personOf(p.from), to: personOf(p.to), amount: p.amount, ...(upi ? { upiLink: upiLink({ upi, name: personOf(p.to).name, amount: p.amount, note: `${toli.name} · TripWise` }) } : {}) };
    }),
    totals: {
      total: t.total,
      byCategory: t.byCategory,
      perPerson: memberIds.map((id) => ({ person: personOf(id), share: t.perPerson[id] ?? 0 })),
      mine: { share, personal, total: share + personal },
      // The planner's estimate is in whole rupees; the Lekha counts paise.
      estimate: trip ? trip.estimatedCost.total * 100 : null,
    },
    settlements: db.toliSettlements
      .filter((s) => s.toliId === toli.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(settlementView),
  };
}

export const lekhaHandlers = [
  // ── Expenses ──
  http.post(apiUrl('/tolis/:id/expenses'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const input = (await request.json()) as NewExpense;
      // Sent before (an offline retry)? Answer with the stored one.
      const earlier = db.toliExpenses.find((e) => e.toliId === toli.id && e.addedBy === user.id && e.clientId === input.clientId);
      if (earlier) return HttpResponse.json({ expense: expenseView(earlier, user.id, isLeader(member.role)) });

      const title = (input.title ?? '').trim();
      if (!input.clientId) return invalid('Something went wrong — please try again.');
      if (!title || title.length > 80) return invalid('Say what it was for (under 80 characters).');
      if (!goodAmount(input.amount)) return invalid('Enter an amount up to ₹5,00,000.');
      if (!CATEGORIES.includes(input.category) || !['upi', 'cash'].includes(input.method)) return invalid('Pick a category and how it was paid.');
      const memberIds = toli.members.map((m) => m.userId);
      const paidBy = input.personal ? user.id : (input.paidBy ?? user.id);
      const split: Split = input.personal ? { kind: 'equal', among: [user.id] } : (input.split ?? { kind: 'equal', among: memberIds });
      const result = splitExpense(input.amount, split);
      if (!result.ok) return invalid(SPLIT_PROBLEM[result.reason]);
      if (!memberIds.includes(paidBy) || Object.keys(result.parts).some((id) => !memberIds.includes(id))) return invalid('Only Sahyatris of this Toli can share an expense.');

      const expense: MockExpense = {
        id: newId('ex'),
        toliId: toli.id,
        addedBy: user.id,
        clientId: input.clientId,
        personal: !!input.personal,
        title,
        amount: input.amount,
        category: input.category,
        method: input.method,
        ...(input.day ? { day: input.day } : {}),
        paidBy,
        parts: result.parts,
        createdAt: new Date().toISOString(),
      };
      db.toliExpenses.push(expense);
      if (!expense.personal) logEvent(toli.id, user.id, 'expense-added', { expenseId: expense.id, title, amount: expense.amount });
      return HttpResponse.json({ expense: expenseView(expense, user.id, isLeader(member.role)) }, { status: 201 });
    }),
  ),

  http.get(apiUrl('/tolis/:id/expenses'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const mine = db.toliExpenses
        .filter((e) => e.toliId === toli.id && !e.deletedAt && (!e.personal || e.addedBy === user.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json({ expenses: mine.map((e) => expenseView(e, user.id, isLeader(member.role))) });
    }),
  ),

  http.delete(apiUrl('/tolis/:id/expenses/:eid'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const expense = db.toliExpenses.find((e) => e.id === params.eid && e.toliId === toli.id && !e.deletedAt);
      // Someone else's personal expense doesn't exist as far as anyone else knows.
      if (!expense || (expense.personal && expense.addedBy !== user.id)) return errorResponse(404, 'NOT_FOUND', 'That expense isn’t here.');
      if (!expense.personal && expense.addedBy !== user.id && !isLeader(member.role)) return errorResponse(403, 'FORBIDDEN', 'Only whoever added it, or a leader, can delete it.');
      expense.deletedAt = new Date().toISOString();
      if (!expense.personal) logEvent(toli.id, user.id, 'expense-deleted', { title: expense.title, amount: expense.amount });
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // ── Settling up ──
  http.post(apiUrl('/tolis/:id/settlements'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      const input = (await request.json()) as NewSettlement;
      const earlier = db.toliSettlements.find((s) => s.toliId === toli.id && s.recordedBy === user.id && s.clientId === input.clientId);
      if (earlier) return HttpResponse.json({ settlement: settlementView(earlier) });
      const memberIds = toli.members.map((m) => m.userId);
      if (!goodAmount(input.amount)) return invalid('Enter an amount up to ₹5,00,000.');
      if (input.from === input.to) return invalid('Someone can’t pay themselves back.');
      if (!memberIds.includes(input.from) || !memberIds.includes(input.to)) return invalid('Both people must be Sahyatris of this Toli.');
      const settlement: MockSettlement = { id: newId('st'), toliId: toli.id, from: input.from, to: input.to, amount: input.amount, method: input.method, recordedBy: user.id, clientId: input.clientId, createdAt: new Date().toISOString() };
      db.toliSettlements.push(settlement);
      logEvent(toli.id, user.id, 'settled', { from: input.from, to: input.to, amount: input.amount });
      return HttpResponse.json({ settlement: settlementView(settlement) }, { status: 201 });
    }),
  ),

  http.get(apiUrl('/tolis/:id/lekha'), ({ request, params }) => asMember(request, params.id, (user, toli) => HttpResponse.json({ lekha: lekhaSummary(toli, user.id) }))),
];
