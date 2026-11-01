/**
 * SahyatraTab.tsx — the Toli's shared trip (Sahyatra): each day with its stops, where anyone
 * can suggest a change (a new stop, renaming a day, swapping, removing or moving a stop,
 * changing transport, or adding a day), then the open suggestions to vote on (leaders approve
 * or decline) and the decided ones. Without a plan yet, it points to the Decide tab.
 */
import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTrip } from '@/features/trips/hooks';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from './hooks';
import { SuggestForm, type SuggestTarget } from './SuggestForm';
import { SujhavCard } from './SujhavCard';

/** Which form is open (one at a time), by a key. */
type OpenForm = { key: string; target: SuggestTarget } | null;

/** The Sahyatra tab. */
export function SahyatraTab({ toli }: { toli: Toli }) {
  const { w, english } = useWords();
  const trip = useTrip(toli.tripId ?? '');
  const sujhavs = useQuery({ queryKey: ['sujhavs', toli.id], queryFn: () => toliApi.sujhavs(toli.id), select: (d) => d.sujhavs, refetchInterval: TOLI_REFRESH_MS, enabled: !!toli.tripId });
  const [form, setForm] = useState<OpenForm>(null);

  if (!toli.tripId) {
    return (
      <section className="glass-strong grid gap-3 rounded-card p-6">
        <h2 className="text-2xl">No {w.sahyatra} yet</h2>
        <p className="text-soft">Decide where and when together in the Decide tab, then plan the shared trip with TripWise.</p>
        <Link to="?tab=decide" replace className="justify-self-start font-semibold underline decoration-accent decoration-2 underline-offset-4">
          Go to Decide
        </Link>
      </section>
    );
  }

  /** The form for a target, if it's the open one. */
  const formFor = (key: string) => (form?.key === key ? <SuggestForm toliId={toli.id} target={form.target} onDone={() => setForm(null)} /> : null);
  /** A "suggest" button that opens a form. */
  const suggest = (key: string, target: SuggestTarget, label: string, text = 'Suggest…') => (
    <button type="button" aria-label={label} onClick={() => setForm(form?.key === key ? null : { key, target })} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-line px-3 text-sm font-semibold hover:bg-ink/6">
      <Lightbulb aria-hidden className="size-3.5" /> {text}
    </button>
  );
  const open = sujhavs.data?.filter((s) => s.status === 'open') ?? [];
  const decided = sujhavs.data?.filter((s) => s.status !== 'open') ?? [];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
      {/* The plan */}
      <div className="grid gap-4">
        {trip.isPending && <Skeleton className="h-64 rounded-card" />}
        {trip.data && (
          <>
            <div className="glass-strong rounded-card p-5">
              <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">{english ? 'The shared trip' : 'Sahyatra · the shared trip'}</p>
              <h2 className="mt-1 text-2xl">{trip.data.title}</h2>
              <p className="text-sm text-soft">Anyone can suggest a change; the {w.sutradhar} and {w.sah}s decide.</p>
            </div>
            {trip.data.days.map((day) => (
              <section key={day.dayNumber} aria-label={`Day ${day.dayNumber} · ${day.theme}`} className="glass-strong grid gap-3 rounded-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl">
                    Day {day.dayNumber} · {day.theme}
                  </h3>
                  {suggest(`day-${day.dayNumber}`, { kind: 'day', day: day.dayNumber, stops: day.activities.length }, `Suggest a stop for Day ${day.dayNumber}`, 'Suggest for this day')}
                </div>
                {formFor(`day-${day.dayNumber}`)}
                <ul className="grid gap-2">
                  {day.activities.map((stop, i) => (
                    <li key={`${stop.title}-${i}`} className="grid gap-2 border-b border-line pb-2 last:border-0">
                      <div className="flex items-start gap-3">
                        <span className="w-12 shrink-0 font-semibold">{stop.startTime ?? ''}</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold">{stop.title}</h4>
                          <p className="text-sm text-soft">{stop.description}</p>
                        </div>
                        {suggest(
                          `stop-${day.dayNumber}-${i}`,
                          { kind: 'stop', day: day.dayNumber, index: i, stop, days: trip.data.days.length, last: i === day.activities.length - 1 },
                          `Suggest a change to ${stop.title}`,
                        )}
                      </div>
                      {formFor(`stop-${day.dayNumber}-${i}`)}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              {suggest('trip', { kind: 'trip' }, 'Suggest adding a day', 'Suggest adding a day')}
            </div>
            {formFor('trip')}
          </>
        )}
      </div>

      {/* Suggestions */}
      <aside className="grid gap-4 lg:sticky lg:top-28">
        <section className="glass-strong grid gap-3 rounded-card p-5">
          <h2 className="text-xl">
            {english ? (
              'Suggestions'
            ) : (
              <>
                Sujhav{' '}
                <span lang="hi" className="font-hindi text-base text-[#b8862f]">
                  सुझाव
                </span>{' '}
                · suggestions
              </>
            )}
          </h2>
          {sujhavs.isPending && <Skeleton className="h-24 rounded-2xl" />}
          {sujhavs.data && open.length === 0 && <p className="text-sm text-soft">No open suggestions. Use “Suggest…” on the plan.</p>}
          {sujhavs.data && (
            <ul aria-label="Open suggestions" className="grid gap-3">
              {open.map((s) => (
                <li key={s.id}>
                  <SujhavCard toli={toli} sujhav={s} />
                </li>
              ))}
            </ul>
          )}
        </section>
        {decided.length > 0 && (
          <section className="glass grid gap-3 rounded-card p-5">
            <h2 className="text-lg">Decided</h2>
            <ul aria-label="Decided suggestions" className="grid gap-3">
              {decided.map((s) => (
                <li key={s.id}>
                  <SujhavCard toli={toli} sujhav={s} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
