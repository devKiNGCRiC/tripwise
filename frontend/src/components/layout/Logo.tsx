/**
 * Logo.tsx — the TripWise wordmark: a small gateway-arch mark in the region's colour
 * (shape from WorldDefs' #archClip) beside the name in Fraunces.
 */
import { Link } from 'react-router';
import { cn } from '@/lib/utils/cn';

/** The TripWise wordmark linking home. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="TripWise home" className={cn('group flex items-center gap-2.5 rounded-full', className)}>
      <span aria-hidden className="h-[30px] w-[26px] bg-accent transition-transform duration-500 [clip-path:url(#archClip)] group-hover:-translate-y-0.5" />
      <span className="font-display text-[21px] font-semibold tracking-tight">TripWise</span>
    </Link>
  );
}
