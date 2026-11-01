/**
 * ExpenseList.tsx — the Toli's expenses, newest first: what for, how much, who paid and who
 * shared it ("personal · only you see this" for your own), the category, day and how it was
 * paid, with Delete for whoever may. Expenses still waiting for signal show on top.
 */
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatRupees } from '@lekha-rules';
import type { NewExpense, ToliExpense } from '@/lib/api/types';
import { CATEGORY_LABEL, METHOD_LABEL, paidLine } from './labels';

/** The list of expenses. */
export function ExpenseList({ expenses, pending, memberCount, meId, onDelete }: { expenses: ToliExpense[]; pending: NewExpense[]; memberCount: number; meId?: string; onDelete: (e: ToliExpense) => Promise<void> }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  /** Delete one, showing why if it can't be. */
  async function remove(expense: ToliExpense) {
    setBusy(expense.id);
    setError('');
    try {
      await onDelete(expense);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t delete that.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="grid gap-2">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <ul aria-label="Expenses" className="grid gap-2">
        {pending.map((p) => (
          <li key={p.clientId}>
            <article aria-label={`Waiting to save: ${p.title}`} className="grid gap-0.5 rounded-2xl border border-dashed border-line bg-white/50 px-4 py-3 dark:bg-white/5">
              <p className="flex justify-between gap-3 font-semibold">
                <span>{p.title}</span>
                <span>{formatRupees(p.amount)}</span>
              </p>
              <p className="text-xs text-soft">⏳ Waiting for signal — it will save by itself</p>
            </article>
          </li>
        ))}
        {expenses.map((e) => (
          <li key={e.id}>
            <article aria-label={`${e.title}, ${formatRupees(e.amount)}`} className="grid gap-1 rounded-2xl border border-line bg-white/70 px-4 py-3 dark:bg-white/5">
              <p className="flex items-start justify-between gap-3">
                <span className="font-semibold">{e.title}</span>
                <span className="font-semibold tabular-nums">{formatRupees(e.amount)}</span>
              </p>
              <p className="text-sm text-soft">{e.personal ? 'personal · only you see this' : paidLine(e.paidBy, e.shares.map((s) => s.person), memberCount, meId)}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-soft">
                <span>
                  {CATEGORY_LABEL[e.category]} · {METHOD_LABEL[e.method]}
                  {e.day ? ` · Day ${e.day}` : ''}
                </span>
                {e.canDelete && (
                  <button type="button" aria-label={`Delete ${e.title}`} disabled={busy === e.id} onClick={() => void remove(e)} className="inline-flex items-center gap-1 font-semibold hover:text-danger disabled:opacity-50">
                    <Trash2 aria-hidden className="size-3.5" /> Delete
                  </button>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>
      {expenses.length === 0 && pending.length === 0 && <p className="text-soft">No expenses yet. Add the first one — only those who shared it will split it.</p>}
    </div>
  );
}
