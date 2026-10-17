/**
 * Skeleton.tsx — softly pulsing placeholder block shown while data loads.
 * Hidden from screen readers; pair it with a visually-hidden "Loading…" status where needed.
 */
import { cn } from '@/lib/utils/cn';

/** A pulsing loading placeholder. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-card bg-ink/8', className)} />;
}
