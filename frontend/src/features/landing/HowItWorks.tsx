/**
 * HowItWorks.tsx — the three planning steps, drawn as stations on a railway line.
 * The steps really are a sequence, so they're numbered and in an ordered list.
 * A little train rolls to whichever station you hover or focus.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

const STEPS = [
  {
    title: 'Pick your vibe',
    text: "Where, when, budget, who's coming, and the stuff you love: beaches, food, temples, nightlife.",
    color: 'bg-yellow',
  },
  {
    title: 'AI plans every day',
    text: 'Morning to night, with rough costs, local tips and a packing list that suits the weather.',
    color: 'bg-sky',
  },
  {
    title: 'Save, share, go',
    text: 'Download the PDF, send the link to your friends, and collect a stamp in your passport.',
    color: 'bg-green',
  },
];

export function HowItWorks() {
  const [station, setStation] = useState(0);

  return (
    <section aria-labelledby="how-heading" className="rangoli-dots py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="how-heading" className="text-[clamp(40px,5.6vw,76px)] [font-stretch:125%]">
          Three stops to a full plan
        </h2>
        <p className="mt-4 max-w-[54ch] text-xl text-ink-soft">
          No forms that feel like tax returns. Tap a few choices and the planner does the rest.
        </p>

        <div className="relative mt-16">
          {/* The track: black sleepers on yellow, like a level-crossing barrier */}
          <div
            aria-hidden
            className="absolute top-[30px] right-[4%] left-[4%] hidden h-2.5 rounded-md border-2 border-black [background:repeating-linear-gradient(90deg,#000_0_22px,var(--trip-yellow)_22px_44px)] md:block"
          />
          <span
            aria-hidden
            className="absolute -top-7 hidden text-4xl transition-[left] duration-1000 ease-[cubic-bezier(.5,0,.2,1)] md:block"
            style={{ left: `${2 + station * 33}%` }}
          >
            🚂
          </span>

          <ol aria-label="How TripWise works" className="grid gap-10 md:grid-cols-3 md:gap-7">
            {STEPS.map((step, i) => (
              <li key={step.title} onPointerEnter={() => setStation(i)} onFocus={() => setStation(i)} className="relative">
                <span
                  aria-hidden
                  className={cn(
                    'grid size-[70px] place-items-center rounded-full border-[3px] border-black font-display text-3xl font-black text-black shadow-[4px_4px_0_#000]',
                    step.color,
                  )}
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 text-3xl [font-stretch:118%]">{step.title}</h3>
                <p className="mt-2 max-w-[32ch] text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
