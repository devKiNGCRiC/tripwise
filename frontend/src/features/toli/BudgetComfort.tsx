/**
 * BudgetComfort.tsx — the private budget check: each Sahyatri sets the daily range they're
 * comfortable with, and everyone sees only the range that suits all who answered (or the gap
 * to bridge) — never anyone else's numbers.
 */
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { ToliBudget } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from './hooks';

/** "₹2,500". */
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
/** Field styles. */
const FIELD = 'h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';

/** The group's line: the shared range, the gap, or that nobody has answered. */
function groupLine(group: ToliBudget['group']) {
  const who = group.answered === group.members ? `all ${group.members}` : `${group.answered} of ${group.members}`;
  if (group.range) return `${rupees(group.range[0])} – ${rupees(group.range[1])} a day suits ${who}`;
  if (group.closest) return `No range suits everyone yet — the gap is ${rupees(group.closest[0])} to ${rupees(group.closest[1])} a day`;
  return 'Nobody has set a range yet';
}

/** The budget comfort card. */
export function BudgetComfort({ toliId }: { toliId: string }) {
  const queryClient = useQueryClient();
  const budget = useQuery({ queryKey: ['budget', toliId], queryFn: () => toliApi.budget(toliId), select: (d) => d.budget, refetchInterval: TOLI_REFRESH_MS });
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /** Save my range. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { budget: next } = await toliApi.setBudget(toliId, Number(low), Number(high));
      queryClient.setQueryData(['budget', toliId], { budget: next });
      void queryClient.invalidateQueries({ queryKey: ['toli', toliId] });
      setLow('');
      setHigh('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Budget comfort" className="glass-strong grid gap-3 rounded-card p-5">
      <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">Budget comfort · private</p>
      {budget.data && <h3 className="text-xl">{groupLine(budget.data.group)}</h3>}
      {budget.data?.mine && (
        <p className="text-sm">
          Your range (only you see it): {rupees(budget.data.mine[0])} – {rupees(budget.data.mine[1])}
        </p>
      )}
      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-2">
        <div className="flex gap-2">
          <label className="grid flex-1 gap-1">
            <span className="text-sm font-semibold">From (₹ a day)</span>
            <input inputMode="numeric" value={low} onChange={(e) => setLow(e.target.value.replace(/\D/g, ''))} className={FIELD} />
          </label>
          <label className="grid flex-1 gap-1">
            <span className="text-sm font-semibold">Up to (₹ a day)</span>
            <input inputMode="numeric" value={high} onChange={(e) => setHigh(e.target.value.replace(/\D/g, ''))} className={FIELD} />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="sm" variant="secondary" loading={saving} disabled={!low || !high} className="justify-self-start">
          Save my range
        </Button>
      </form>
      <p className="text-xs text-soft">Nobody sees anyone’s own numbers — only the range that works for everyone.</p>
    </section>
  );
}
