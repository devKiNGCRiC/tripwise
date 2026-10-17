/**
 * DayTimeline.tsx — one day of a trip on glass: "Day 2 · Sat 13 Dec", the day's theme,
 * then a timeline of timed stops with what to do, rough cost, and how to get to the next
 * stop ("12 min by auto"). Owners can ask for a fresh take on just this day.
 */
import { CarTaxiFront, Bus, Footprints, RefreshCw, Sailboat, TrainFront, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Day, TransferMode } from '@/lib/api/types';
import { formatMoney } from '@/lib/utils/format';
import { dayLabel, transferLabel } from './format';

/** An icon for each way of getting around. */
const MODE_ICON: Record<TransferMode, LucideIcon> = { walk: Footprints, auto: CarTaxiFront, cab: CarTaxiFront, bus: Bus, train: TrainFront, boat: Sailboat };

interface DayTimelineProps {
  day: Day;
  /** Ask for a new version of this day (absent = read-only). */
  onRegenerate?: () => void;
  regenerating?: boolean;
}

/** One day of the itinerary. */
export function DayTimeline({ day, onRegenerate, regenerating = false }: DayTimelineProps) {
  const label = `Day ${day.dayNumber} · ${dayLabel(day.date)}`;
  const dayCost = day.activities.reduce((sum, a) => sum + (a.estCost ?? 0), 0);

  return (
    <section id={`day-${day.dayNumber}`} aria-label={label} className="glass-strong scroll-mt-40 rounded-card p-5 sm:p-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl text-accent">Day {day.dayNumber}</span>
            <span className="text-xs font-bold tracking-[0.14em] text-soft uppercase">{dayLabel(day.date)}</span>
          </p>
          <h3 key={day.theme} className="swap mt-1 text-xl font-semibold">
            {day.theme}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {dayCost > 0 && <span className="text-sm font-semibold text-soft">≈ {formatMoney({ amount: dayCost, currency: 'INR' })} on activities</span>}
          {onRegenerate && (
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Regenerate day ${day.dayNumber}`}
              loading={regenerating}
              icon={<RefreshCw aria-hidden className="size-3.5" />}
              onClick={onRegenerate}
            >
              New idea
            </Button>
          )}
        </div>
      </header>

      <ol className="mt-5 ml-1 border-l-2 border-accent/30 pl-5">
        {day.activities.map((activity, i) => {
          const Icon = activity.transfer ? MODE_ICON[activity.transfer.mode] : null;
          return (
            <li key={`${activity.startTime}-${i}`} className="relative pb-1">
              <span aria-hidden className="absolute top-2 -left-[27px] size-3 rounded-full border-2 border-paper bg-accent" />
              <div className="grid gap-x-4 sm:grid-cols-[64px_1fr_auto]">
                <span className="font-semibold tabular-nums">{activity.startTime ?? activity.time}</span>
                <div>
                  <p className="font-semibold">{activity.title}</p>
                  <p className="text-[15px] text-soft">{activity.description}</p>
                </div>
                {activity.estCost ? <span className="text-sm font-semibold text-soft sm:text-right">{formatMoney({ amount: activity.estCost, currency: 'INR' })}</span> : null}
              </div>
              {activity.transfer && Icon && (
                <p className="my-3 flex items-center gap-1.5 text-[13.5px] text-soft sm:ml-[80px]">
                  <Icon aria-hidden className="size-4" />
                  {transferLabel(activity.transfer)}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
