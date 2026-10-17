/**
 * ItineraryView.tsx — a whole trip, the way a traveller reads it: a ticket-style header
 * (destination, dates, who, pace, summary), each day as a timed timeline, and a side
 * column with the cost breakdown, tips and packing list. `actions` (owner-only buttons)
 * sit in the header; `onRegenerateDay` adds a per-day "new idea" button. Without them the
 * view is read-only (shared links).
 */
import { CalendarDays, Plane, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Itinerary } from '@/lib/api/types';
import { CostBreakdown } from './CostBreakdown';
import { DayTimeline } from './DayTimeline';
import { PACE_LABEL, rangeLabel, TRAVELLER_LABEL } from './format';

interface ItineraryViewProps {
  itinerary: Itinerary;
  /** Buttons shown in the header (Download PDF, Share, Delete…) */
  actions?: ReactNode;
  onRegenerateDay?: (day: number) => void;
  /** Which day is being regenerated right now */
  regeneratingDay?: number | null;
}

/** The full itinerary. */
export function ItineraryView({ itinerary, actions, onRegenerateDay, regeneratingDay = null }: ItineraryViewProps) {
  const { request } = itinerary;
  return (
    <div className="grid gap-6">
      {/* Ticket header */}
      <header className="glass-strong rounded-[32px] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-soft uppercase">
          <Plane aria-hidden className="size-4 text-accent" /> Your itinerary
        </p>
        <h1 className="mt-2 text-[clamp(38px,5vw,72px)]">{itinerary.title}</h1>
        <p className="mt-3 max-w-[60ch] text-lg text-soft">{itinerary.summary}</p>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
          <li className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
            <CalendarDays aria-hidden className="size-4" /> {rangeLabel(request.startDate, request.endDate)}
          </li>
          <li className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5">
            <Users aria-hidden className="size-4" /> {TRAVELLER_LABEL[request.travellers]}
          </li>
          <li className="rounded-full border border-line px-3 py-1.5">{PACE_LABEL[request.pace]}</li>
        </ul>
        {actions && <div className="mt-6 flex flex-wrap gap-2.5 border-t border-line pt-5">{actions}</div>}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <div className="grid gap-5">
          {itinerary.days.map((day) => (
            <DayTimeline
              key={day.dayNumber}
              day={day}
              onRegenerate={onRegenerateDay ? () => onRegenerateDay(day.dayNumber) : undefined}
              regenerating={regeneratingDay === day.dayNumber}
            />
          ))}
        </div>
        <aside className="grid gap-5 lg:sticky lg:top-24">
          <CostBreakdown cost={itinerary.estimatedCost} />
          <section aria-labelledby="tips-title" className="glass-strong rounded-card p-6">
            <h2 id="tips-title" className="text-xs font-bold tracking-[0.14em] text-soft uppercase">
              Good to know
            </h2>
            <ul className="mt-3 grid gap-2.5">
              {itinerary.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rotate-45 bg-accent" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="packing-title" className="glass-strong rounded-card p-6">
            <h2 id="packing-title" className="text-xs font-bold tracking-[0.14em] text-soft uppercase">
              Packing list
            </h2>
            <ul aria-label="Packing list" className="mt-3 flex flex-wrap gap-2">
              {itinerary.packingList.map((item) => (
                <li key={item} className="rounded-full border border-line px-3 py-1 text-sm font-medium">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
