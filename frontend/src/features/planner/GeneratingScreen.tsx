/**
 * GeneratingScreen.tsx — what the traveller sees while the AI plans: the destination in
 * large type, a status line that changes every 1.5 s ("Reading the season…") and an
 * indeterminate progress bar. Announced politely to screen readers.
 */
import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';

/** The steps a planner (human or AI) goes through, shown in turn. */
const MESSAGES = ['Reading the season…', 'Routing day 1…', 'Finding food the locals love…', 'Pricing stays…', 'Timing the sunsets…', 'Packing your list…'];

/** The planning-in-progress card. */
export function GeneratingScreen({ destination }: { destination: string }) {
  const [step, setStep] = useState(0);

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
    </GlassPanel>
  );
}
