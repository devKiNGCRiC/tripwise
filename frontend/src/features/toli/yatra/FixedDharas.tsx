/**
 * FixedDharas.tsx — for college and office Tolis: groups that stay the same for the whole trip
 * (Bus 1, Section A), each with its own lead (a Sah-Sutradhar for that group). Leaders set them
 * up; everyone sees them and joins one.
 */
import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli } from '@/lib/api/types';
import { SplitCard, useSplits } from './DayDharas';

/** Field styles. */
const FIELD = 'h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';

/** The form for fixed Dharas. */
function FixedForm({ toli, onDone }: { toli: Toli; onDone: () => void }) {
  const { w } = useWords();
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState([
    { name: '', leadId: '' },
    { name: '', leadId: '' },
  ]);
  const [error, setError] = useState('');

  /** Change one group's field. */
  const edit = (i: number, field: 'name' | 'leadId', value: string) => setGroups((list) => list.map((g, j) => (j === i ? { ...g, [field]: value } : g)));

  /** Save the groups. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await toliApi.createSplit(toli.id, { day: null, dharas: groups.map((g) => ({ name: g.name.trim(), ...(g.leadId ? { leadId: g.leadId } : {}) })) });
      void queryClient.invalidateQueries({ queryKey: ['splits', toli.id] });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that.');
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3">
      {groups.map((g, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{`${w.dhara} ${i + 1} name`}</span>
            <input value={g.name} onChange={(e) => edit(i, 'name', e.target.value)} maxLength={40} placeholder={`Bus ${i + 1}`} className={FIELD} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{`${w.dhara} ${i + 1} lead`}</span>
            <select value={g.leadId} onChange={(e) => edit(i, 'leadId', e.target.value)} className={FIELD}>
              <option value="">No lead</option>
              {toli.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      {groups.length < 6 && (
        <button type="button" onClick={() => setGroups([...groups, { name: '', leadId: '' }])} className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold">
          <Plus aria-hidden className="size-4" /> Add another
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!groups.every((g) => g.name.trim())}>
          Save fixed {w.dharas}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** The fixed Dharas card (college and office Tolis). */
export function FixedDharas({ toli }: { toli: Toli }) {
  const { w } = useWords();
  const splits = useSplits(toli.id);
  const [making, setMaking] = useState(false);
  const fixed = splits.data?.filter((s) => s.day === null) ?? [];
  const leads = toli.me.role !== 'sahyatri';

  return (
    <section aria-label={`Fixed ${w.dharas}`} className="glass-strong grid gap-3 rounded-card p-5">
      <h2 className="text-xl">Fixed {w.dharas}</h2>
      <p className="text-sm text-soft">Groups for the whole trip — a bus, a section — each with its own lead.</p>
      {fixed.map((s) => (
        <SplitCard key={s.id} toli={toli} split={s} />
      ))}
      {fixed.length === 0 && !leads && <p className="text-sm text-soft">Your leaders haven’t set any up yet.</p>}
      {leads && (making ? <FixedForm toli={toli} onDone={() => setMaking(false)} /> : <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setMaking(true)}>{`Set up fixed ${w.dharas}`}</Button>)}
    </section>
  );
}
