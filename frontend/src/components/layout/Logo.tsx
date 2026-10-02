/**
 * Logo.tsx — the TripWise wordmark: a tilted coral "stamp" tile with a plane + name.
 */
import { Plane } from 'lucide-react';
import { Link } from 'react-router';

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2 rounded-full focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sky">
      <span className="grid size-9 -rotate-6 place-items-center rounded-xl border-2 border-line bg-coral text-on-accent shadow-pop-sm transition group-hover:rotate-0">
        <Plane className="size-5" aria-hidden />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">TripWise</span>
    </Link>
  );
}
