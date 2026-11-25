/**
 * Logo.tsx — the TripWise wordmark: the gateway mark (BrandMark.tsx) beside the name in Fraunces.
 * The mark takes the text colour, so it reads in light and dark; it lifts a little on hover.
 */
import { Link } from 'react-router';
import { cn } from '@/lib/utils/cn';
import { BrandMark } from './BrandMark';

/** The TripWise wordmark linking home. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="TripWise home" className={cn('group flex items-center gap-2 rounded-full', className)}>
      <BrandMark size={32} className="text-ink transition-transform duration-500 group-hover:-translate-y-0.5" />
      <span className="font-display text-[21px] font-semibold tracking-tight">TripWise</span>
    </Link>
  );
}
