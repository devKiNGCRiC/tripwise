/**
 * Planner.tsx — the hero's planning bar: where, when, who's going, budget per day, Plan.
 * "Plan" opens the planner with the destination filled in (guests go through login
 * first, which the route guard handles). The "who" value is shared with the hero
 * chips and the traveller cards (state lives in LandingPage).
 */
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/lib/utils/format';
import { KINDS } from './kinds';

/** Shared look of each field's small caps label. */
const FIELD_LABEL = 'text-[10.5px] font-bold tracking-[0.14em] text-soft uppercase';
/** One field cell; the divider becomes horizontal when the bar stacks on small screens. */
const FIELD = 'grid min-w-0 content-center gap-0.5 border-line px-4 py-2 max-lg:border-b lg:border-r';

interface PlannerProps {
  /** Places in the current region, used as the placeholder. */
  places: string[];
  who: string;
  onWhoChange: (who: string) => void;
}

export function Planner({ places, who, onWhoChange }: PlannerProps) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState(3000);

  /** Go to the planner, pre-filling the destination if one was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = destination.trim();
    navigate(trimmed ? `/plan?destination=${encodeURIComponent(trimmed)}` : '/plan');
  }

  return (
    <form onSubmit={handleSubmit} className="glass-strong grid rounded-3xl p-1.5 lg:grid-cols-[1.3fr_0.9fr_0.95fr_1.15fr_auto]">
      <label className={FIELD}>
        <span aria-hidden className={FIELD_LABEL}>
          Where to
        </span>
        <input
          aria-label="Where do you want to go?"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          placeholder={`${places.slice(0, 3).join(', ')}…`}
          className="min-w-0 bg-transparent py-0.5 font-semibold text-ink outline-none placeholder:font-medium placeholder:text-soft"
        />
      </label>
      <label className={FIELD}>
        <span className={FIELD_LABEL}>When</span>
        <select className="w-full min-w-0 bg-transparent py-0.5 pr-1 font-semibold text-ink outline-none">
          <option>Any month</option>
          <option>This month</option>
          <option>Next 3 months</option>
          <option>Festival season</option>
        </select>
      </label>
      <label className={FIELD}>
        <span className={FIELD_LABEL}>Who's going</span>
        <select value={who} onChange={(event) => onWhoChange(event.target.value)} className="w-full min-w-0 bg-transparent py-0.5 pr-1 font-semibold text-ink outline-none">
          {KINDS.map((kind) => (
            <option key={kind.who} value={kind.who}>
              {kind.who}
            </option>
          ))}
        </select>
      </label>
      <label className={`${FIELD} lg:border-r-0`}>
        <span className={FIELD_LABEL}>
          Budget per day · <b className="text-ink">{formatMoney({ amount: budget, currency: 'INR' })}</b>
        </span>
        <input
          type="range"
          min={1000}
          max={15000}
          step={500}
          value={budget}
          onChange={(event) => setBudget(Number(event.target.value))}
          className="w-full accent-[var(--trip-accent)]"
        />
      </label>
      <Button type="submit" variant="glow" size="lg" className="m-0.5 h-auto min-h-12 rounded-[18px]" icon={<ArrowRight aria-hidden className="order-last size-4" />}>
        Plan
      </Button>
    </form>
  );
}
