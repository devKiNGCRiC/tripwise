/**
 * Logo.tsx — the TripWise wordmark: the name in the editorial serif, with
 * "यात्री" (traveller) set small in gold beside it.
 */
import { Link } from 'react-router';
import { cn } from '@/lib/utils/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="TripWise home" className={cn('group flex items-baseline gap-1.5 rounded-full', className)}>
      <span className="font-display text-[26px] leading-none tracking-tight">TripWise</span>
      <span lang="hi" aria-hidden className="text-[15px] text-gold transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5">
        यात्री
      </span>
    </Link>
  );
}
