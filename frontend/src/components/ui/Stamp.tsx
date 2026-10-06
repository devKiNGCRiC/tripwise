/**
 * Stamp.tsx — a round, double-ringed passport stamp: a place name with its Hindi
 * name underneath ("GOA / गोवा"), tilted like it was thumped on by hand.
 * Used on the passport page (one per saved trip) and as a playful badge.
 */
import { cn } from '@/lib/utils/cn';

export type StampTone = 'green' | 'red' | 'sky' | 'orange';

/** Ink colours — the deep shades so the text stays readable on paper. */
const TONES: Record<StampTone, string> = {
  green: 'border-green-deep text-green-deep',
  red: 'border-danger text-danger',
  sky: 'border-sky-deep text-sky-deep',
  orange: 'border-orange text-orange',
};

interface StampProps {
  /** Main text, e.g. "Goa" (shown in capitals). */
  label: string;
  /** Second line in local script, e.g. "गोवा". */
  localLabel?: string;
  tone?: StampTone;
  /** Tilt in degrees — real stamps are never straight. */
  rotate?: number;
  className?: string;
}

export function Stamp({ label, localLabel, tone = 'green', rotate = -8, className }: StampProps) {
  return (
    <span
      className={cn(
        'inline-grid size-24 shrink-0 place-content-center rounded-full border-4 border-double text-center leading-tight',
        TONES[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span className="font-display text-[15px] font-black uppercase font-stretch-125%">{label}</span>
      {localLabel && <span className="text-[13px] font-extrabold">{localLabel}</span>}
    </span>
  );
}
