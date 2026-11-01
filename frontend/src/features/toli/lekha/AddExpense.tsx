/**
 * AddExpense.tsx — writing an expense down: what for, how much (₹), category, UPI or cash, the
 * day of the Sahyatra, who paid (me by default) and who shared it (everyone by default — untick
 * whoever didn't), split equally, by amounts or by shares. Each person's part shows as you type,
 * and Add waits until the split adds up. "Only for me" makes it personal: only you will see it.
 * The expense is handed to the outbox, so it is kept safe until there's signal.
 */
import { useState, type FormEvent } from 'react';
import { formatRupees, splitExpense, toPaise, type Split } from '@lekha-rules';
import { Button } from '@/components/ui/Button';
import type { Category, NewExpense, PayMethod, Toli } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { newClientId } from '../useOutbox';
import { CATEGORY_LABEL, METHOD_LABEL } from './labels';

/** Field styles. */
const FIELD = 'h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';
/** The biggest single expense (₹5,00,000), in paise. */
const MAX_AMOUNT = 50_000_000;
/** Ways to split. */
const SPLITS: { kind: Split['kind']; label: string }[] = [
  { kind: 'equal', label: 'Equally' },
  { kind: 'amounts', label: 'By amounts' },
  { kind: 'shares', label: 'By shares' },
];

/** The add-an-expense form. */
export function AddExpense({ toli, meId, days, onAdd }: { toli: Toli; meId: string; days: number; onAdd: (expense: NewExpense) => void }) {
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [method, setMethod] = useState<PayMethod>('upi');
  const [day, setDay] = useState('');
  const [paidBy, setPaidBy] = useState(meId);
  const [personal, setPersonal] = useState(false);
  const [left, setLeft] = useState<string[]>([]);
  const [kind, setKind] = useState<Split['kind']>('equal');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  const amount = toPaise(amountText);
  const sharers = toli.members.filter((m) => !left.includes(m.id));
  const nameOf = (id: string) => (id === meId ? 'you' : (toli.members.find((m) => m.id === id)?.name ?? ''));

  // The split as it stands, and each person's part (or why it doesn't work yet).
  const split: Split =
    kind === 'equal'
      ? { kind, among: sharers.map((m) => m.id) }
      : kind === 'amounts'
        ? { kind, amounts: Object.fromEntries(sharers.map((m) => [m.id, toPaise(amounts[m.id] ?? '') ?? 0])) }
        : { kind, shares: Object.fromEntries(sharers.map((m) => [m.id, Number(shares[m.id] || '1')])) };
  const result = amount && amount <= MAX_AMOUNT ? splitExpense(amount, personal ? { kind: 'equal', among: [meId] } : split) : null;
  const assigned = kind === 'amounts' ? sharers.reduce((sum, m) => sum + (toPaise(amounts[m.id] ?? '') ?? 0), 0) : 0;
  const ready = !!title.trim() && !!result?.ok;

  /** A short line on how it splits. */
  function splitLine() {
    if (!amount || personal) return null;
    if (kind === 'amounts') {
      const rest = amount - assigned;
      return rest > 0 ? `${formatRupees(rest)} left to assign` : rest < 0 ? `${formatRupees(-rest)} too much` : 'Adds up ✓';
    }
    if (!result?.ok) return null;
    const parts = Object.values(result.parts);
    const [low, high] = [Math.min(...parts), Math.max(...parts)];
    return kind === 'equal' ? (low === high ? `${formatRupees(low)} each` : `${formatRupees(low)}–${formatRupees(high)} each`) : sharers.map((m) => `${nameOf(m.id)} ${formatRupees(result.parts[m.id] ?? 0)}`).join(' · ');
  }

  /** Hand the expense over, then clear the form for the next one. */
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!ready || !amount) return;
    onAdd({
      clientId: newClientId(),
      title: title.trim(),
      amount,
      category,
      method,
      ...(day ? { day: Number(day) } : {}),
      ...(personal ? { personal: true } : { paidBy, split }),
    });
    setTitle('');
    setAmountText('');
    setAmounts({});
  }

  const line = splitLine();
  return (
    <section aria-label="Add an expense" className="glass-strong grid gap-3 rounded-card p-5">
      <h3 className="text-xl">Add an expense</h3>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">What for</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Thali dinner" className={FIELD} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Amount (₹)</span>
            <input value={amountText} onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="600" className={FIELD} />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={FIELD}>
              {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="grid gap-1">
            <legend className="text-sm font-semibold">Paid with</legend>
            <div className="flex gap-1.5">
              {(Object.keys(METHOD_LABEL) as PayMethod[]).map((m) => (
                <label key={m} className={cn('flex h-11 flex-1 cursor-pointer items-center justify-center rounded-2xl border text-sm font-semibold', method === m ? 'border-accent bg-accent/10' : 'border-line')}>
                  <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                  {METHOD_LABEL[m]}
                </label>
              ))}
            </div>
          </fieldset>
          {days > 0 && (
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Day of the trip</span>
              <select value={day} onChange={(e) => setDay(e.target.value)} className={FIELD}>
                <option value="">Any day</option>
                {Array.from({ length: days }, (_, i) => (
                  <option key={i} value={i + 1}>
                    Day {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={personal} onChange={(e) => setPersonal(e.target.checked)} className="size-4 accent-[var(--color-accent)]" />
          Only for me (personal — only you will see it)
        </label>

        {!personal && (
          <>
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Who paid</span>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={FIELD}>
                {toli.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === meId ? 'You' : m.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-semibold">Who shared it</legend>
              <div className="flex flex-wrap gap-1.5">
                {toli.members.map((m) => (
                  <label key={m.id} className={cn('flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm', left.includes(m.id) ? 'border-line text-soft' : 'border-accent bg-accent/10 font-semibold')}>
                    <input
                      type="checkbox"
                      checked={!left.includes(m.id)}
                      onChange={(e) => setLeft((now) => (e.target.checked ? now.filter((id) => id !== m.id) : [...now, m.id]))}
                      className="sr-only"
                      aria-label={m.id === meId ? 'You' : m.name}
                    />
                    {m.id === meId ? 'You' : m.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-semibold">Split</legend>
              <div className="flex flex-wrap gap-1.5">
                {SPLITS.map((s) => (
                  <label key={s.kind} className={cn('cursor-pointer rounded-full border px-3 py-1.5 text-sm', kind === s.kind ? 'border-ink bg-ink text-on-ink' : 'border-line')}>
                    <input type="radio" name="split" checked={kind === s.kind} onChange={() => setKind(s.kind)} className="sr-only" />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {kind !== 'equal' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {sharers.map((m) =>
                  kind === 'amounts' ? (
                    <label key={m.id} className="grid gap-1">
                      <span className="text-sm">{`Amount for ${nameOf(m.id)} (₹)`}</span>
                      <input value={amounts[m.id] ?? ''} onChange={(e) => setAmounts({ ...amounts, [m.id]: e.target.value.replace(/[^\d.,]/g, '') })} inputMode="decimal" className={FIELD} />
                    </label>
                  ) : (
                    <label key={m.id} className="grid gap-1">
                      <span className="text-sm">{`Shares for ${nameOf(m.id)}`}</span>
                      <input type="number" min={1} max={100} value={shares[m.id] ?? '1'} onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })} className={FIELD} />
                    </label>
                  ),
                )}
              </div>
            )}
          </>
        )}

        {line && <p className="text-sm font-semibold text-soft">{line}</p>}
        {amount !== null && amount > MAX_AMOUNT && <p className="text-sm text-danger">That’s more than ₹5,00,000 — add it in parts.</p>}
        <Button type="submit" disabled={!ready} className="justify-self-start">
          Add expense
        </Button>
      </form>
    </section>
  );
}
