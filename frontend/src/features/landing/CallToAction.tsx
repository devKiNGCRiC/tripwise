/**
 * CallToAction.tsx — closing aurora band pushing visitors to start planning.
 */
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';

export function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="relative overflow-hidden rounded-card border-2 border-line shadow-pop-lg">
        <div className="aurora-fill absolute inset-0" aria-hidden />
        <div className="relative flex flex-col items-start gap-6 p-8 text-white sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-4xl font-extrabold sm:text-5xl">Your next trip is 30 seconds away.</h2>
            <p className="mt-3 max-w-xl text-white/90">Free forever. No card. Just vibes and a plan.</p>
          </div>
          <Link to="/plan" className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'shrink-0' })}>
            <Sparkles className="size-5" aria-hidden /> Start planning
          </Link>
        </div>
      </div>
    </section>
  );
}
