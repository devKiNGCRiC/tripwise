/**
 * SuggestForm.tsx — the small form for a suggestion (Sujhav), opened from the Sahyatra:
 *   for a day:   add a stop (a place or experience, and when), or rename the day
 *   for a stop:  swap it for something else, remove it, move it to another day, or change
 *                how we get to the next stop
 *   for the trip: add a day at the end
 * Every suggestion can carry a short note for the Toli. Sending it closes the form.
 */
import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { Activity, SujhavChange } from '@/lib/api/types';

/** What the form is about. */
export type SuggestTarget = { kind: 'day'; day: number; stops: number } | { kind: 'stop'; day: number; index: number; stop: Activity; days: number; last: boolean } | { kind: 'trip' };

/** Field styles. */
const FIELD = 'h-11 rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';

/** The suggestion form. */
export function SuggestForm({ toliId, target, onDone }: { toliId: string; target: SuggestTarget; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState(target.kind === 'stop' ? 'swap' : target.kind === 'day' ? 'add' : 'add-day');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [theme, setTheme] = useState('');
  const [toDay, setToDay] = useState(1);
  const [mode, setMode] = useState('auto');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  /** The change the form describes. */
  function change(): SujhavChange {
    const stop = { time, title: title.trim(), description: '' };
    if (target.kind === 'trip') return { kind: 'add-day', theme: theme.trim() };
    if (target.kind === 'day') return choice === 'add' ? { kind: 'add-stop', day: target.day, at: target.stops, stop } : { kind: 'retheme-day', day: target.day, theme: theme.trim() };
    const at = { day: target.day, index: target.index, title: target.stop.title };
    if (choice === 'remove') return { kind: 'remove-stop', ...at };
    if (choice === 'move') return { kind: 'move-stop', ...at, toDay, toIndex: 99 };
    if (choice === 'transport') return { kind: 'change-transport', ...at, mode };
    return { kind: 'swap-stop', ...at, stop };
  }

  /** Send it to the Toli. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await toliApi.suggest(toliId, change(), note.trim() || undefined);
      void queryClient.invalidateQueries({ queryKey: ['sujhavs', toliId] });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send that — try again.');
    } finally {
      setSending(false);
    }
  }

  /** One radio choice. */
  const radio = (value: string, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name="suggest-choice" value={value} checked={choice === value} onChange={() => setChoice(value)} /> {label}
    </label>
  );
  const needsPlace = (target.kind === 'day' && choice === 'add') || (target.kind === 'stop' && choice === 'swap');
  const needsTheme = target.kind === 'trip' || (target.kind === 'day' && choice === 'theme');

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 rounded-2xl border border-accent/40 bg-white/80 p-4 dark:bg-white/5">
      {target.kind === 'day' && (
        <div role="radiogroup" aria-label="What to suggest" className="flex flex-wrap gap-4">
          {radio('add', 'Add a stop')}
          {radio('theme', 'Rename the day')}
        </div>
      )}
      {target.kind === 'stop' && (
        <div role="radiogroup" aria-label="What to suggest" className="flex flex-wrap gap-4">
          {radio('swap', 'Swap it for…')}
          {radio('remove', 'Remove it')}
          {target.days > 1 && radio('move', 'Move to another day')}
          {!target.last && radio('transport', 'Change how we get to the next stop')}
        </div>
      )}
      {needsPlace && (
        <div className="flex flex-wrap gap-2">
          <label className="grid min-w-52 flex-1 gap-1">
            <span className="text-sm font-semibold">Place or experience</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={FIELD} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">When</span>
            <select value={time} onChange={(e) => setTime(e.target.value as typeof time)} className={FIELD}>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </label>
        </div>
      )}
      {needsTheme && (
        <label className="grid gap-1">
          <span className="text-sm font-semibold">{target.kind === 'trip' ? 'What is the extra day for?' : 'New name for the day'}</span>
          <input value={theme} onChange={(e) => setTheme(e.target.value)} maxLength={80} className={FIELD} />
        </label>
      )}
      {target.kind === 'stop' && choice === 'move' && (
        <label className="grid gap-1">
          <span className="text-sm font-semibold">Move to</span>
          <select value={toDay} onChange={(e) => setToDay(Number(e.target.value))} className={FIELD}>
            {Array.from({ length: target.days }, (_, i) => i + 1)
              .filter((d) => d !== target.day)
              .map((d) => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
          </select>
        </label>
      )}
      {target.kind === 'stop' && choice === 'transport' && (
        <label className="grid gap-1">
          <span className="text-sm font-semibold">Go by</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={FIELD}>
            {['walk', 'auto', 'cab', 'bus', 'train', 'boat'].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Note for the Toli (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} className={FIELD} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={sending} disabled={(needsPlace && !title.trim()) || (needsTheme && !theme.trim())}>
          Send suggestion
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
