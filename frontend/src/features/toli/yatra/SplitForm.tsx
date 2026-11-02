/**
 * SplitForm.tsx — splitting a day into Dharas: a name (and optional stops) for each, at least
 * two and up to six, and the Sangam — where and at what time everyone meets again. A leader's
 * split is used at once; a Sahyatri's waits for a leader ("Suggest a split").
 */
import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli } from '@/lib/api/types';
import { indiaTime } from './time';

/** Field styles. */
const FIELD = 'h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';

/** The split-a-day form. */
export function SplitForm({ toli, day, date, onDone }: { toli: Toli; day: number; date: string; onDone: () => void }) {
  const { w } = useWords();
  const queryClient = useQueryClient();
  const [dharas, setDharas] = useState([
    { name: '', stops: '' },
    { name: '', stops: '' },
  ]);
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const leads = toli.me.role !== 'sahyatri';

  /** Change one Dhara's field. */
  const edit = (i: number, field: 'name' | 'stops', value: string) => setDharas((list) => list.map((d, j) => (j === i ? { ...d, [field]: value } : d)));

  /** Send the split. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await toliApi.createSplit(toli.id, {
        day,
        dharas: dharas.map((d) => ({ name: d.name.trim(), stops: d.stops.split(',').map((s) => s.trim()).filter(Boolean) })),
        sangam: { place: place.trim(), at: indiaTime(date, time) },
      });
      void queryClient.invalidateQueries({ queryKey: ['splits', toli.id] });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t split the day.');
    } finally {
      setSending(false);
    }
  }

  const ready = dharas.every((d) => d.name.trim()) && place.trim() && /^\d{2}:\d{2}$/.test(time);
  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 rounded-2xl border border-line bg-white/60 p-4 dark:bg-white/5">
      <p className="text-sm text-soft">Split the day into {w.dharas.toLowerCase()} — each goes its own way — then meet again.</p>
      {dharas.map((d, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{`${w.dhara} ${i + 1} name`}</span>
            <input value={d.name} onChange={(e) => edit(i, 'name', e.target.value)} maxLength={40} placeholder={i === 0 ? 'Backwater walk' : 'Fort Kochi'} className={FIELD} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Stops (optional, commas between)</span>
            <input value={d.stops} onChange={(e) => edit(i, 'stops', e.target.value)} placeholder="Canoe ride, toddy shop" className={FIELD} />
          </label>
        </div>
      ))}
      {dharas.length < 6 && (
        <button type="button" onClick={() => setDharas([...dharas, { name: '', stops: '' }])} className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold">
          <Plus aria-hidden className="size-4" /> Add another {w.dhara}
        </button>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
        <label className="grid gap-1">
          <span className="text-sm font-semibold">Where to meet again</span>
          <input value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} placeholder="Boat jetty" className={FIELD} />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-semibold">At what time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={FIELD} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={sending} disabled={!ready}>
          {leads ? 'Split this day' : 'Suggest a split'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
