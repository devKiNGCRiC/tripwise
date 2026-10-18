/**
 * GeneratingScreen.tsx — what the traveller sees while the AI plans: the destination in
 * large type, a status line that changes every 1.5 s ("Reading the season…") and an
 * indeterminate progress bar. The living landscape turns into the destination's world
 * (for India's seven worlds). Below it, the trip appears as the AI writes it: the title,
 * then "Day 1 · theme", "Day 2 · theme"… Announced politely to screen readers.
 */
import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useTripWorld } from '@/features/trips/useTripWorld';
import type { TripPreview } from './hooks';

/** The steps a planner (human or AI) goes through, shown in turn. */
const MESSAGES = ['Reading the season…', 'Routing day 1…', 'Finding food the locals love…', 'Pricing stays…', 'Timing the sunsets…', 'Packing your list…'];

/** The planning-in-progress card; `preview` is the trip so far (it streams in). */
export function GeneratingScreen({ destination, preview }: { destination: string; preview?: TripPreview }) {
  const [step, setStep] = useState(0);
  useTripWorld(destination);

  // Rotate the status line.
  useEffect(() => {
    const timer = window.setInterval(() => setStep((s) => (s + 1) % MESSAGES.length), 1500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <GlassPanel className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
      <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">Planning your trip</p>
      <h2 className="text-[clamp(36px,5vw,60px)]">{destination}</h2>
      <p role="status" key={step} className="swap text-lg text-soft">
        {MESSAGES[step]}
      </p>
      {/* Indeterminate progress: a light sweeping along the track */}
      <span aria-hidden className="relative h-1.5 w-full overflow-hidden rounded-full bg-accent/20">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-[sweep_1.4s_ease-in-out_infinite] rounded-full bg-accent" />
      </span>
      {/* The trip as the AI writes it: its title, then each day as soon as it's ready. */}
      {preview?.title && (
        <p key={preview.title} className="swap font-display text-2xl">
          {preview.title}
        </p>
      )}
      {preview && preview.days.length > 0 && (
        <ol aria-label="Days planned so far" aria-live="polite" className="grid w-full gap-2 text-left">
          {preview.days.map((day) => (
            <li key={day.dayNumber} className="swap flex items-baseline gap-3 rounded-2xl bg-ink/5 px-4 py-2.5">
              <span className="shrink-0 text-sm font-bold text-accent">Day {day.dayNumber}</span>
              <span className="font-semibold">{day.theme}</span>
            </li>
          ))}
        </ol>
      )}
    </GlassPanel>
  );
}
