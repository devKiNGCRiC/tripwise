/**
 * lekha.ts (routes) — a Toli's money (login required; amounts in whole paise):
 *
 *   POST   /api/tolis/:id/expenses        { clientId, title, amount, category, method, day?,
 *                                            personal?, paidBy?, split? }  → 201 { expense }
 *                                            (the same clientId again → 200 with the stored one)
 *   GET    /api/tolis/:id/expenses        → { expenses }   group ones + my personal ones, newest first
 *   DELETE /api/tolis/:id/expenses/:eid   → 204            group: whoever added it or leaders;
 *                                                           personal: the owner only (others 404)
 *
 * Group expenses are split only among the members who shared them (everyone, by default).
 * Personal expenses are the owner's own record: never shown to anyone else, never in activity.
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { ToliExpense } from '../db/models/index.js';
import { badRequest, forbidden, notFound } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { expenseViews } from '../services/lekha.js';
import { CATEGORIES, splitExpense, type Split } from '../services/lekhaRules.js';
import { loadMember, logActivity } from '../services/tolis.js';
import { isLeader, type ToliRole } from '../services/toliRules.js';

/** The biggest single expense (₹5,00,000), in paise. */
const MAX_AMOUNT = 50_000_000;

/** Who shared an expense, and how. */
const splitSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('equal'), among: z.array(z.string()).max(500) }),
  z.object({ kind: z.literal('amounts'), amounts: z.record(z.string(), z.number().int().min(0)) }),
  z.object({ kind: z.literal('shares'), shares: z.record(z.string(), z.number()) }),
]);

/** A new expense. */
const expenseSchema = z.object({
  clientId: z.string().min(1).max(100),
  title: z.string().trim().min(1, 'Say what it was for.').max(80, 'Keep it under 80 characters.'),
  amount: z.number().int('Amounts are in whole paise.').min(1, 'Enter an amount.').max(MAX_AMOUNT, 'That’s more than ₹5,00,000 — split it into parts.'),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  method: z.enum(['upi', 'cash']),
  day: z.number().int().min(1).max(30).optional(),
  personal: z.boolean().optional(),
  paidBy: z.string().optional(),
  split: splitSchema.optional(),
});

/** Why a split was refused, in words. */
const SPLIT_PROBLEM = {
  empty: 'Choose who shared it.',
  mismatch: 'The amounts should add up to the total.',
  'bad-share': 'Shares are whole numbers from 1 to 100.',
} as const;

/** The Lekha routes. */
export function lekhaRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  // POST /tolis/:id/expenses — write an expense down (offline-safe).
  router.post('/tolis/:id/expenses', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const input = expenseSchema.parse(req.body);
    const toliId = toli._id.toString();

    // Sent before (an offline retry)? Answer with the stored one.
    const earlier = await ToliExpense.findOne({ toliId, addedBy: me, clientId: input.clientId });
    if (earlier) {
      res.json({ expense: (await expenseViews([earlier], me, member.role as ToliRole))[0] });
      return;
    }

    // Personal: mine, paid by me. Group: paid by a member, shared among members.
    const memberIds = new Set(toli.members.map((m) => m.userId.toString()));
    const paidBy = input.personal ? me : (input.paidBy ?? me);
    const split: Split = input.personal ? { kind: 'equal', among: [me] } : ((input.split as Split | undefined) ?? { kind: 'equal', among: [...memberIds] });
    const result = splitExpense(input.amount, split);
    if (!result.ok) throw badRequest(SPLIT_PROBLEM[result.reason]);
    if (!memberIds.has(paidBy) || Object.keys(result.parts).some((id) => !memberIds.has(id))) throw badRequest('Only Sahyatris of this Toli can share an expense.');

    const at = now();
    const expense = await ToliExpense.create({
      toliId,
      addedBy: me,
      clientId: input.clientId,
      personal: !!input.personal,
      title: input.title,
      amount: input.amount,
      category: input.category,
      method: input.method,
      ...(input.day ? { day: input.day } : {}),
      paidBy,
      parts: result.parts,
      createdAt: at,
    });
    if (!expense.personal) await logActivity(toliId, me, 'expense-added', { expenseId: expense._id.toString(), title: expense.title, amount: expense.amount }, at);
    res.status(201).json({ expense: (await expenseViews([expense], me, member.role as ToliRole))[0] });
  });

  // GET /tolis/:id/expenses — the Toli's expenses and my own personal ones.
  router.get('/tolis/:id/expenses', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const expenses = await ToliExpense.find({
      toliId: toli._id.toString(),
      deletedAt: { $exists: false },
      $or: [{ personal: false }, { personal: true, addedBy: me }],
    }).sort({ createdAt: -1, _id: -1 });
    res.json({ expenses: await expenseViews(expenses, me, member.role as ToliRole) });
  });

  // DELETE /tolis/:id/expenses/:eid — remove one (kept, marked deleted).
  router.delete('/tolis/:id/expenses/:eid', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    const eid = String(req.params.eid);
    const expense = isValidObjectId(eid) ? await ToliExpense.findOne({ _id: eid, toliId: toli._id.toString(), deletedAt: { $exists: false } }) : null;
    // Someone else's personal expense doesn't exist as far as anyone else knows.
    if (!expense || (expense.personal && expense.addedBy !== me)) throw notFound('That expense isn’t here.');
    if (!expense.personal && expense.addedBy !== me && !isLeader(member.role as ToliRole)) throw forbidden('Only whoever added it, or a leader, can delete it.');
    const at = now();
    expense.deletedAt = at;
    expense.deletedBy = me;
    await expense.save();
    if (!expense.personal) await logActivity(toli._id.toString(), me, 'expense-deleted', { title: expense.title, amount: expense.amount }, at);
    res.status(204).end();
  });

  return router;
}
