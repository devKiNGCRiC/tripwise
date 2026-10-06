/**
 * DepartureBoard.tsx — TripWise's signature element: a yellow Indian-railway
 * platform board whose flip letters cycle through destinations ("GOA", "MANALI"…)
 * with the Hindi name underneath.
 *
 * Accessibility: the flipping tiles are decorative (aria-hidden); a visually
 * hidden line carries the real text. It is NOT a live region, so screen readers
 * aren't interrupted every few seconds. With reduced motion the board stays put.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils/cn';

export interface BoardStop {
  /** Name shown on the tiles, e.g. "Goa" (rendered in capitals). */
  name: string;
  /** Name in the local script, e.g. "गोवा". */
  localName?: string;
}

interface DepartureBoardProps {
  stops: BoardStop[];
  /** Time each stop stays on the board. Default 3200ms. */
  intervalMs?: number;
  /** Small line on the left of the board's header. */
  label?: string;
  /** Small line on the right of the board's header. */
  platform?: string;
  className?: string;
}

export function DepartureBoard({
  stops,
  intervalMs = 3200,
  label = 'Next stop',
  platform = 'Platform 1',
  className,
}: DepartureBoardProps) {
  const reduceMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  // Advance to the next stop on a timer (never when motion is reduced or there's only one stop).
  useEffect(() => {
    if (reduceMotion || stops.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % stops.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [reduceMotion, stops.length, intervalMs]);

  const stop = stops[index] ?? stops[0];
  if (!stop) return null;
  const letters = [...stop.name.toUpperCase()];

  return (
    <div className={cn('relative w-full max-w-[620px]', className)}>
      {/* The two posts the board hangs from — a small detail that makes it read as a station sign. */}
      <span aria-hidden className="absolute -top-8 left-[18%] h-8 w-1.5 bg-neutral-800" />
      <span aria-hidden className="absolute -top-8 right-[18%] h-8 w-1.5 bg-neutral-800" />

      {/* Always black-on-yellow in both themes: it's a physical railway sign, not themed UI. */}
      <div className="rounded-xl border-[3px] border-black bg-yellow px-5 pt-4 pb-3 text-black shadow-[8px_8px_0_#000] sm:px-7">
        <div aria-hidden className="flex justify-between gap-4 text-lg font-semibold">
          <span>{label}</span>
          <span>{platform}</span>
        </div>

        {/* Flip tiles. --n (letter count) shrinks long names so "Varanasi" fits like "Goa". */}
        <div
          aria-hidden
          key={stop.name}
          className="my-2 flex gap-1.5 font-display leading-none font-black [font-size:calc(clamp(40px,6.6vw,88px)*min(1,5.5/var(--n)))] font-stretch-135% [perspective:400px]"
          style={{ '--n': Math.max(letters.length, 3) } as CSSProperties}
        >
          {letters.map((letter, i) => (
            <span
              key={`${stop.name}-${i}`}
              className={cn(
                'relative inline-block min-w-[0.62em] rounded-md bg-black px-0.5 pt-1.5 pb-1 text-center text-yellow',
                // the hinge line across the middle of a real split-flap tile
                'after:absolute after:inset-x-0 after:top-1/2 after:h-0.5 after:bg-yellow/25',
                !reduceMotion && 'animate-flap',
              )}
              style={reduceMotion ? undefined : { animationDelay: `${i * 60}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>

        {stop.localName && (
          <p aria-hidden className="text-[clamp(26px,3.2vw,40px)] leading-tight font-extrabold">
            {stop.localName}
          </p>
        )}
        <p className="sr-only">
          {label}: {stop.name}
          {stop.localName ? ` (${stop.localName})` : ''}
        </p>
      </div>
    </div>
  );
}
