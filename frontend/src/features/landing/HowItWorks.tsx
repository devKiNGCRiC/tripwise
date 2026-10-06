/**
 * HowItWorks.tsx — Stage 2, the Glacier: the three planning steps, drawn as
 * stations on a railway line. They really are a sequence, so they're numbered
 * and in an ordered list. A little train rolls to the station you hover or focus.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { DescentStage, GlassPanel } from './DescentStage';

const STEPS = [
  { title: 'Pick your vibe', text: "Where, when, budget, who's coming, and the stuff you love: beaches, food, temples, nightlife.", color: 'bg-yellow' },
  { title: 'AI plans every day', text: 'Morning to night, with rough costs, local tips and a packing list that suits the weather.', color: 'bg-sky' },
  { title: 'Save, share, go', text: 'Download the PDF, send the link to your friends, and collect a stamp in your passport.', color: 'bg-green' },
];

export function HowItWorks() {
  const [station, setStation] = useState(0);

  return (
    <DescentStage name="Glacier">
      <GlassPanel>
        <h2 className="text-[clamp(34px,4.6vw,62px)] font-stretch-125%">Three stops to a full plan</h2>
        <p className="mt-3 max-w-[52ch] text-lg text-ink-soft">No forms that feel like tax returns. Tap a few choices and the planner does the rest.</p>

        <div className="relative mt-12">
          {/* The track: black sleepers on yellow, like a level-crossing barrier */}
          <div aria-hidden className="absolute top-7.5 right-[4%] left-[4%] hidden h-2.5 rounded-md border-2 border-black [background:repeating-linear-gradient(90deg,#000_0_22px,var(--trip-yellow)_22px_44px)] md:block" />
          <span aria-hidden className="absolute -top-7 hidden text-4xl transition-[left] duration-1000 ease-[cubic-bezier(.5,0,.2,1)] md:block" style={{ left: `${2 + station * 33}%` }}>
            🚂
          </span>
          <ol aria-label="How TripWise works" className="grid gap-8 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} onPointerEnter={() => setStation(i)} className="relative">
                <span aria-hidden className={cn('grid size-16 place-items-center rounded-full border-[3px] border-black font-display text-2xl font-black text-black shadow-[4px_4px_0_#000]', step.color)}>
                  {i + 1}
                </span>
                <h3 className="mt-5 text-2xl font-stretch-115%">{step.title}</h3>
                <p className="mt-2 text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </GlassPanel>
    </DescentStage>
  );
}
