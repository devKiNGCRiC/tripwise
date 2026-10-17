/**
 * SectionStop.tsx — the small "02 —— Journeys" label above each landing section.
 * The homepage reads as one journey: every section is a numbered stop on the route
 * (the same stops the JourneyRail marks down the side of the page).
 */
import { cn } from '@/lib/utils/cn';

export function SectionStop({ n, label, className }: { n: string; label: string; className?: string }) {
  return (
    <p className={cn('flex items-center gap-3 text-xs font-medium tracking-[0.22em] text-ink-soft uppercase', className)}>
      <span className="text-gold tabular-nums">{n}</span>
      <span aria-hidden className="h-px w-8 bg-gold/60" />
      {label}
    </p>
  );
}
