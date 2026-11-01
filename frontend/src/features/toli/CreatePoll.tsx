/**
 * CreatePoll.tsx — "New poll" in the Decide tab: where to go (places — TripWise adds its own
 * facts for places it knows), when (Tithi: date ranges, several may be picked), how to travel,
 * or any question, with 2–10 options. Sends it to the Toli (it also appears in Chaupal).
 */
import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { NewPoll, PollKind, TravelMode } from '@/lib/api/types';

/** Field styles. */
const FIELD = 'h-11 rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';
/** Ways of travelling offered. */
const MODES: [TravelMode, string][] = [
  ['train', 'Train'],
  ['bus', 'Bus'],
  ['flight', 'Flight'],
  ['car', 'Road trip by car'],
  ['bike', 'Bike ride'],
];

/** The new-poll form. */
export function CreatePoll({ toliId, onDone }: { toliId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<PollKind>('tithi');
  const [question, setQuestion] = useState('');
  const [labels, setLabels] = useState(['', '']);
  const [dates, setDates] = useState([
    { start: '', end: '' },
    { start: '', end: '' },
  ]);
  const [modes, setModes] = useState<TravelMode[]>(['train', 'bus']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  /** The poll the form describes. */
  function poll(): NewPoll {
    if (kind === 'tithi') return { kind, options: dates.filter((d) => d.start && d.end) };
    if (kind === 'transport') return { kind, options: modes.map((mode) => ({ mode })) };
    const options = labels.map((l) => l.trim()).filter(Boolean).map((label) => ({ label }));
    return kind === 'free' ? { kind, question: question.trim(), options } : { kind, options };
  }

  /** Create it. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await toliApi.createPoll(toliId, poll());
      void queryClient.invalidateQueries({ queryKey: ['polls', toliId] });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t create that poll.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="glass-strong grid gap-3 rounded-card p-5">
      <h3 className="text-xl">New poll</h3>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Kind of poll</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as PollKind)} className={FIELD}>
          <option value="tithi">Dates (Tithi)</option>
          <option value="destination">Where to go</option>
          <option value="transport">How to travel</option>
          <option value="free">Any question</option>
        </select>
      </label>
      {kind === 'free' && (
        <label className="grid gap-1">
          <span className="text-sm font-semibold">Question</span>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} placeholder="Which homestay?" className={FIELD} />
        </label>
      )}
      {kind === 'tithi' &&
        dates.map((d, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <label className="grid flex-1 gap-1">
              <span className="text-sm font-semibold">From</span>
              <input type="date" value={d.start} onChange={(e) => setDates(dates.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} className={FIELD} />
            </label>
            <label className="grid flex-1 gap-1">
              <span className="text-sm font-semibold">To</span>
              <input type="date" value={d.end} onChange={(e) => setDates(dates.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} className={FIELD} />
            </label>
          </div>
        ))}
      {(kind === 'destination' || kind === 'free') &&
        labels.map((l, i) => (
          <label key={i} className="grid gap-1">
            <span className="text-sm font-semibold">Option {i + 1}</span>
            <input value={l} onChange={(e) => setLabels(labels.map((x, j) => (j === i ? e.target.value : x)))} maxLength={80} placeholder={kind === 'destination' ? 'Hampi' : ''} className={FIELD} />
          </label>
        ))}
      {kind === 'transport' && (
        <div role="group" aria-label="Ways to travel" className="flex flex-wrap gap-3">
          {MODES.map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={modes.includes(mode)} onChange={() => setModes(modes.includes(mode) ? modes.filter((m) => m !== mode) : [...modes, mode])} /> {label}
            </label>
          ))}
        </div>
      )}
      {kind !== 'transport' && (
        <button
          type="button"
          onClick={() => (kind === 'tithi' ? setDates([...dates, { start: '', end: '' }]) : setLabels([...labels, '']))}
          disabled={(kind === 'tithi' ? dates.length : labels.length) >= 10}
          className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4"
        >
          <Plus aria-hidden className="size-3.5" /> Add an option
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={sending}>
          Create poll
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
