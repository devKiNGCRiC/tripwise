/**
 * ArrivalPanel.tsx — the hero's "Now arriving" panel, styled like a flight tracker:
 * a small route map (the flight arc from the last place to this one), the place in
 * Hindi and English, its coordinates, the local time, the best season and a suggested
 * stay — plus the stops (01–04) to jump between places, each with a progress line.
 *
 * One element, two looks: on large screens (xl) a glass card at the bottom-right of the
 * photo; on smaller screens a compact caption (name + stops) at the top-right.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { formatCoords, type HeroPlace } from './heroPlaces';
import { RouteMap } from './RouteMap';

/** Current time in India ("06:42"), refreshed every 30 seconds. */
function useIndiaTime() {
  const format = () =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(format()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return time;
}

interface ArrivalPanelProps {
  places: HeroPlace[];
  index: number;
  previous: number;
  onSelect: (index: number) => void;
  /** How long each place stays (drives the progress line); null = no auto-advance. */
  slideSeconds: number | null;
}

/** Small label + value pair in the panel's facts grid. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.16em] text-ink-soft uppercase">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export function ArrivalPanel({ places, index, previous, onSelect, slideSeconds }: ArrivalPanelProps) {
  const place = places[index];
  const time = useIndiaTime();

  return (
    <aside
      aria-label="Now arriving"
      className={cn(
        // Compact caption over the photo (phones, tablets, small laptops)
        'absolute top-24 right-(--trip-page-pad) flex flex-col items-end text-right text-[#f6efe3] [text-shadow:0_2px_18px_rgb(0_0_0/.45)]',
        // Glass flight-tracker card (large screens)
        'xl:top-auto xl:right-(--trip-gutter) xl:bottom-10 xl:grid xl:w-[460px] xl:grid-cols-[150px_1fr] xl:items-start xl:gap-x-5 xl:rounded-card xl:p-5 xl:text-left xl:text-ink xl:glass-strong xl:[text-shadow:none]',
      )}
    >
      <RouteMap places={places} active={index} previous={previous} className="hidden w-full text-ink xl:row-span-2 xl:block" />

      <div className="xl:min-w-0">
        <p className="hidden items-center justify-between text-[11px] tracking-[0.18em] text-ink-soft uppercase xl:flex">
          Now arriving
          <span className="tracking-normal normal-case tabular-nums">{time} IST</span>
        </p>
        {/* Keyed so each new place fades in */}
        <div key={place.name} className="animate-fade-in opacity-0">
          <p lang="hi" className="text-4xl leading-tight xl:mt-1">
            {place.local}
          </p>
          <p className="mt-0.5 text-sm tracking-[0.16em] uppercase opacity-90 max-xl:hidden">
            {place.name} <span className="text-gold">·</span> <span className="tracking-normal normal-case">{place.line}</span>
          </p>
        </div>
        <span className="sr-only" aria-live="polite">
          Now showing {place.name}
        </span>
      </div>

      <dl className="mt-3 hidden grid-cols-2 gap-x-4 gap-y-2 xl:grid">
        <div className="col-span-2">
          <dt className="text-[11px] tracking-[0.16em] text-ink-soft uppercase">Coordinates</dt>
          <dd className="text-sm font-medium tabular-nums">{formatCoords(place)}</dd>
        </div>
        <Fact label="Best season" value={place.season} />
        <Fact label="Suggested stay" value={place.stay} />
      </dl>

      {/* The stops: jump to any place */}
      <div role="group" aria-label="Choose a place" className="mt-4 flex gap-4 xl:col-span-2 xl:mt-5 xl:border-t xl:border-line xl:pt-4">
        {places.map((p, i) => (
          <button
            key={p.name}
            type="button"
            aria-label={`Show ${p.name}`}
            aria-pressed={i === index}
            onClick={() => onSelect(i)}
            className={cn(
              'flex w-12 flex-col items-start gap-1.5 text-left text-xs font-medium transition-opacity xl:w-auto xl:flex-1',
              i === index ? 'opacity-100' : 'opacity-60 hover:opacity-100',
            )}
          >
            <span>
              {String(i + 1).padStart(2, '0')}
              <span className="ml-1.5 hidden xl:inline">{p.name}</span>
            </span>
            <span className="relative block h-px w-full overflow-hidden bg-current/30">
              {i === index && (
                <span
                  className={cn('absolute inset-0 origin-left bg-gold', slideSeconds != null && 'animate-[slide-progress_linear_forwards]')}
                  style={slideSeconds ? { animationDuration: `${slideSeconds}s` } : undefined}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
