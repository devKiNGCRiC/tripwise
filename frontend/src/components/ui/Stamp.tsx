/**
 * Stamp.tsx — a round, double-ringed passport stamp: a place name with its Hindi
 * name underneath ("GOA / गोवा"), tilted like it was thumped on by hand.
 * Used on the passport page (one per saved trip).
 */
import { cn } from '@/lib/utils/cn';

// Inks that read on both the ivory and the indigo page.
export type StampTone = 'gold' | 'teal' | 'red';

const TONES: Record<StampTone, string> = {
  gold: 'border-accent-2 text-accent-2',
  teal: 'border-accent text-accent',
  red: 'border-danger text-danger',
};

interface StampProps {
  /** Main text, e.g. "Goa" (shown in capitals). */
  label: string;
  /** Second line in local script, e.g. "गोवा". */
  localLabel?: string;
  tone?: StampTone;
  /** Tilt in degrees — real stamps are never straight. */
  rotate?: number;
  /** md = 96px (default), lg = 128px (the passport's stamp page) */
  size?: 'md' | 'lg';
  className?: string;
}

/** A tilted passport stamp. */
export function Stamp({ label, localLabel, tone = 'gold', rotate = -8, size = 'md', className }: StampProps) {
  return (
    <span
      className={cn('inline-grid shrink-0 place-content-center rounded-full border-4 border-double text-center leading-tight', size === 'lg' ? 'size-32' : 'size-24', TONES[tone], className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span className={cn('font-display tracking-wider uppercase', size === 'lg' ? 'text-lg' : 'text-[15px]')}>{label}</span>
      {localLabel && (
        <span lang="hi" className={size === 'lg' ? 'text-base' : 'text-[13px]'}>
          {localLabel}
        </span>
      )}
    </span>
  );
}
