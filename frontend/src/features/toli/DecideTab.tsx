/**
 * DecideTab.tsx — deciding together: the Toli's polls (newest first) and "New poll", the
 * private budget check, and for leaders "Plan the Sahyatra with TripWise", which opens the
 * planner for this Toli prefilled with what's been decided (destination, dates), the budget
 * that suits everyone and the members' favourite interests.
 */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli } from '@/lib/api/types';
import { BudgetComfort } from './BudgetComfort';
import { CreatePoll } from './CreatePoll';
import { TOLI_REFRESH_MS } from './hooks';
import { PollCard } from './PollCard';

/** The planner address for this Toli, with what's known filled in. */
export function planUrl(toli: Toli) {
  const params = new URLSearchParams({ toli: toli.id });
  if (toli.choices.destination) params.set('destination', toli.choices.destination);
  if (toli.choices.startDate && toli.choices.endDate) {
    params.set('start', toli.choices.startDate);
    params.set('end', toli.choices.endDate);
  }
  if (toli.planDefaults.budget) params.set('budget', String(toli.planDefaults.budget));
  if (toli.planDefaults.interests.length) params.set('interests', toli.planDefaults.interests.join(','));
  if (toli.type === 'family') params.set('who', 'Family');
  return `/plan?${params.toString()}`;
}

/** The Decide tab. */
export function DecideTab({ toli }: { toli: Toli }) {
  const polls = useQuery({ queryKey: ['polls', toli.id], queryFn: () => toliApi.polls(toli.id), select: (d) => d.polls, refetchInterval: TOLI_REFRESH_MS });
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Polls</h2>
          {!creating && (
            <Button variant="secondary" onClick={() => setCreating(true)}>
              New poll
            </Button>
          )}
        </div>
        {creating && <CreatePoll toliId={toli.id} onDone={() => setCreating(false)} />}
        {polls.data?.length === 0 && !creating && <p className="glass rounded-card p-5 text-soft">No polls yet. Ask where, when or how — everyone votes in a tap.</p>}
        {polls.data?.map((p) => (
          <PollCard key={p.id} toli={toli} poll={p} />
        ))}
      </div>
      <aside className="grid gap-4 lg:sticky lg:top-28">
        <BudgetComfort toliId={toli.id} />
        {toli.me.role !== 'sahyatri' && (
          <section className="glass-strong grid gap-3 rounded-card p-5">
            <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">Ready?</p>
            <Link to={planUrl(toli)} className={buttonClasses({ variant: 'glow' })}>
              <Sparkles aria-hidden className="size-4" /> Plan the Sahyatra with TripWise
            </Link>
            <p className="text-sm text-soft">Opens the planner with what you’ve decided, the budget that suits everyone and the group’s favourite interests.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
