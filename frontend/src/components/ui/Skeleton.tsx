/**
 * Skeleton.tsx — pulsing placeholder block shown while data loads.
 * Hidden from screen readers; pair it with a visually-hidden "Loading…" status where needed.
 */
import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-ink/10', className)} />;
}
