/**
 * Kolam.tsx — a chain kolam used as an ornamental rule: two mirrored waves cross
 * between every dot, so each dot sits inside its own loop (as drawn on doorsteps
 * in South India). Uses `currentColor` (gold by default). Decorative only.
 */
import { cn } from '@/lib/utils/cn';

/** Number of dots (each 40 units apart). */
const DOTS = 14;
const WIDTH = DOTS * 40;

/** One sine wave across the whole width; sign 1 or -1 mirrors it. */
function wave(sign: 1 | -1) {
  let d = 'M0 30';
  for (let x = 2; x <= WIDTH; x += 2) d += ` L${x} ${(30 + sign * 20 * Math.sin((Math.PI * x) / 40)).toFixed(1)}`;
  return d;
}
const UPPER = wave(1);
const LOWER = wave(-1);

export function Kolam({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} 60`} aria-hidden className={cn('text-gold', className)} fill="none" stroke="currentColor" strokeWidth={1.2}>
      <path d={UPPER} />
      <path d={LOWER} />
      {Array.from({ length: DOTS }, (_, i) => (
        <circle key={i} cx={20 + i * 40} cy={30} r={3} fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}
