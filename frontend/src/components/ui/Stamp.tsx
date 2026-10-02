/**
 * Stamp.tsx — a tilted, double-ringed passport stamp ("GOA ✓", "BOARDING SOON").
 * Pure decoration-with-text: badges, achievements, labels.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type StampTone = 'teal' | 'danger' | 'mustard' | 'violet';

const TONES: Record<StampTone, string> = {
  teal: 'border-teal text-teal',
  danger: 'border-danger text-danger',
  mustard: 'border-mustard bg-mustard/15 text-ink',
  violet: 'border-violet text-violet',
};

interface StampProps {
  children: ReactNode;
  tone?: StampTone;
  /** Tilt in degrees — real stamps are never straight. */
  rotate?: number;
  className?: string;
}

export function Stamp({ children, tone = 'teal', rotate = -8, className }: StampProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border-4 border-double px-4 py-1.5 font-mono text-xs font-bold tracking-[0.2em] uppercase',
        TONES[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}
