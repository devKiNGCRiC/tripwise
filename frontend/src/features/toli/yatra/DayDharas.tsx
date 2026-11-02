/**
 * DayDharas.tsx — a Toli splitting up (Dharas) and meeting again (Sangam):
 *   useSplits   the Toli's splits (refreshing while open)
 *   SplitCard   one split: each Dhara with its stops and people (Join / Leave), the Sangam's place
 *               and time, a reminder when it's within 30 minutes, "I'm here" and the headcount;
 *               a Sahyatri's split shows "Waiting for a leader" (leaders approve; the proposer
 *               may withdraw it)
 *   DayDharas   the splits of one day of the Sahyatra, and "Split Day n" to make one
 */
import { useState } from 'react';
import { MapPin, Split as SplitIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli, ToliSplit } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from '../hooks';
import { SplitForm } from './SplitForm';
import { clockText, minutesUntil } from './time';

/** How long before a Sangam to remind everyone (minutes). */
const REMIND_MINUTES = 30;

/** The Toli's splits. */
export function useSplits(toliId: string) {
  return useQuery({ queryKey: ['splits', toliId], queryFn: () => toliApi.splits(toliId), select: (d) => d.splits, refetchInterval: TOLI_REFRESH_MS });
}

/** "a", "a and b", "a, b and c" — here just joined with commas. */
const names = (people: { name: string }[]) => people.map((p) => p.name).join(', ');

/** One split. */
export function SplitCard({ toli, split }: { toli: Toli; split: ToliSplit }) {
  const { w } = useWords();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const leads = toli.me.role !== 'sahyatri';
  const meHere = split.headcount.here.some((p) => p.id === user?.id);
  const soon = split.sangam ? minutesUntil(split.sangam.at) : null;

  /** Run an action, then refresh the splits. */
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      const result = await action();
      // Actions that answer with the split update it at once; others refresh.
      if (result && typeof result === 'object' && 'split' in result) {
        queryClient.setQueryData<{ splits: ToliSplit[] }>(['splits', toli.id], (old) => old && { splits: old.splits.map((s) => (s.id === split.id ? (result as { split: ToliSplit }).split : s)) });
      }
      void queryClient.invalidateQueries({ queryKey: ['splits', toli.id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <SplitIcon aria-hidden className="size-4" /> {w.dharas}
        </p>
        {split.status === 'proposed' && <span className="rounded-full bg-ink/6 px-2.5 py-0.5 text-xs font-semibold">Waiting for a leader · suggested by {split.createdBy.name}</span>}
      </div>
      {soon !== null && soon > 0 && soon <= REMIND_MINUTES && (
        <p role="status" className="rounded-xl bg-accent/15 px-3 py-2 text-sm font-semibold">
          ⏰ {w.sangam} at {split.sangam!.place} in {soon} min
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {split.dharas.map((d) => {
          const mine = d.members.some((m) => m.id === user?.id);
          return (
            <article key={d.id} aria-label={d.name} className="grid gap-1 rounded-xl bg-white/70 p-3 dark:bg-white/5">
              <h4 className="font-semibold">{d.name}</h4>
              {d.lead && <p className="text-xs text-soft">Lead: {d.lead.name}</p>}
              {d.stops.length > 0 && <p className="text-sm text-soft">{d.stops.join(' · ')}</p>}
              <p className="text-sm">{d.members.length ? names(d.members) : 'Nobody yet'}</p>
              {split.status === 'active' && (
                <Button size="sm" variant={mine ? 'ghost' : 'secondary'} disabled={busy} className="justify-self-start" onClick={() => void run(() => (mine ? toliApi.leaveDhara(toli.id, split.id, d.id) : toliApi.joinDhara(toli.id, split.id, d.id)))}>
                  {mine ? `Leave ${d.name}` : `Join ${d.name}`}
                </Button>
              )}
            </article>
          );
        })}
      </div>
      {split.sangam && (
        <div className="grid gap-1.5">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <MapPin aria-hidden className="size-4" />
            <span>{`${w.sangam} · ${split.sangam.place}, ${clockText(split.sangam.at)}`}</span>
          </p>
          {split.status === 'active' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={meHere ? 'ghost' : 'primary'} disabled={busy} onClick={() => void run(() => (meHere ? toliApi.notHere(toli.id, split.id) : toliApi.here(toli.id, split.id)))}>
                {meHere ? 'I’m here ✓ (undo)' : 'I’m here'}
              </Button>
              <span className="text-sm">
                Here: {split.headcount.here.length} of {split.headcount.here.length + split.headcount.missing.length}
                {split.headcount.here.length > 0 && split.headcount.missing.length > 0 && ` · Missing: ${names(split.headcount.missing)}`}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {split.status === 'proposed' && leads && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(() => toliApi.approveSplit(toli.id, split.id))}>
            Approve split
          </Button>
        )}
        {(leads || (split.status === 'proposed' && split.createdBy.id === user?.id)) && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => toliApi.deleteSplit(toli.id, split.id))}>
            {split.status === 'proposed' && !leads ? 'Withdraw' : 'Remove split'}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** One day's splits, and splitting it. */
export function DayDharas({ toli, day, date, splits }: { toli: Toli; day: number; date: string; splits: ToliSplit[] }) {
  const [splitting, setSplitting] = useState(false);
  return (
    <div className="grid gap-2">
      {splits.map((s) => (
        <SplitCard key={s.id} toli={toli} split={s} />
      ))}
      {splitting ? (
        <SplitForm toli={toli} day={day} date={date} onDone={() => setSplitting(false)} />
      ) : (
        <button type="button" aria-label={`Split Day ${day}`} onClick={() => setSplitting(true)} className="inline-flex h-8 items-center gap-1 justify-self-start rounded-full border border-line px-3 text-sm font-semibold hover:bg-ink/6">
          <SplitIcon aria-hidden className="size-3.5" /> Split the day
        </button>
      )}
    </div>
  );
}
