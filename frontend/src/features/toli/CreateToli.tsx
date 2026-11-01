/**
 * CreateToli.tsx — "Start a Toli": a name and the kind of trip (college and office are for
 * adults and start in announcement mode; school trips for under-18s come later, with
 * parents' consent). Opened from a trip (`fromTrip`), that trip becomes the Toli's Sahyatra.
 * On success it opens the new Toli.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { useTrip } from '@/features/trips/hooks';
import { useWords } from '@/features/words/WordsProvider';
import { article } from '@/features/words/words';
import { toliApi } from '@/lib/api/endpoints';
import type { TripType } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { useToliAction } from './hooks';
import { TYPE_LABEL } from './labels';

/** The kinds of trip, in the order offered. */
const TYPES: TripType[] = ['friends', 'family', 'college', 'office'];

/** The "Start a Toli" form. */
export function CreateToli({ fromTrip }: { fromTrip?: string }) {
  const { w } = useWords();
  const navigate = useNavigate();
  const trip = useTrip(fromTrip ?? '');
  const [name, setName] = useState('');
  const [type, setType] = useState<TripType>('friends');
  const create = useToliAction('', (input: { name: string; type: TripType; tripId?: string }) => toliApi.create(input));

  /** Create the Toli and open it. */
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate({ name: name.trim(), type, ...(fromTrip ? { tripId: fromTrip } : {}) }, { onSuccess: ({ toli }) => navigate(`/tolis/${toli.id}`) });
  }

  return (
    <form onSubmit={onSubmit} className="glass-strong grid gap-4 rounded-card p-6" aria-labelledby="start-toli">
      <h2 id="start-toli" className="text-2xl">
        Start {article(w.toli)}
      </h2>
      {fromTrip && trip.data && (
        <p className="rounded-2xl bg-accent/10 px-4 py-2 text-sm">
          Starting from your trip <b>{trip.data.title}</b> — it becomes the {w.toli}’s {w.sahyatra}.
        </p>
      )}
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">{w.toli} name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Goa with the gang"
          maxLength={60}
          className="h-11 rounded-2xl border border-line bg-white/60 px-4 outline-none focus:border-accent dark:bg-white/5"
        />
      </label>
      <div role="radiogroup" aria-label="Kind of trip" className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <label key={t} className={cn('cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold', type === t ? 'border-transparent bg-accent text-on-accent' : 'border-line hover:bg-ink/6')}>
            <input type="radio" name="toli-type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
            {TYPE_LABEL[t]}
          </label>
        ))}
      </div>
      <p className="text-sm text-soft">College and office {w.tolis} start in announcement mode — leaders post, everyone reads. School trips (under 18) come later, with parents’ consent.</p>
      {create.isError && (
        <p role="alert" className="text-sm text-danger">
          {create.error.message}
        </p>
      )}
      <Button type="submit" loading={create.isPending} disabled={name.trim().length < 2} className="justify-self-start">
        Create {w.toli}
      </Button>
    </form>
  );
}
