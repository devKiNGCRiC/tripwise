/**
 * AiMoment.tsx — Stage 4, the Waterfall: "ideas pour in, the plan comes out".
 * A small live demo of the planner thinking: a plane bobbing over an aurora
 * strip while status lines rotate. Status lines pause for reduced motion.
 */
import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { DescentStage, GlassPanel } from './DescentStage';

const LINES = ['Finding the best sunset spots', 'Checking what fits ₹12,000', 'Adding street food you can’t miss', 'Packing for 31°C and a little rain'];

export function AiMoment() {
  const reduceMotion = usePrefersReducedMotion();
  const [line, setLine] = useState(0);

  // Rotate the "thinking" lines every couple of seconds.
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setLine((i) => (i + 1) % LINES.length), 2200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <DescentStage name="Waterfall">
      <GlassPanel className="max-w-xl">
        <h2 className="text-[clamp(32px,4.2vw,54px)] font-stretch-122%">Ideas pour in. The plan comes out.</h2>
        <p className="mt-3 text-lg text-ink-soft">Tell it once. In seconds you get every day planned, costed and ready to share.</p>
        <div className="aurora-fill mt-7 flex items-center gap-4 rounded-2xl border-2 border-black p-5 text-black shadow-[5px_5px_0_#000]">
          <span aria-hidden className="text-4xl motion-safe:animate-bounce">
            ✈️
          </span>
          <div>
            <p className="font-display text-xl font-black font-stretch-115%">Planning your Goa trip</p>
            <p aria-live="off" className="font-semibold">
              {LINES[line]}
            </p>
          </div>
        </div>
      </GlassPanel>
    </DescentStage>
  );
}
