/**
 * WorldsPanel.tsx — India's seven worlds on the passport: a disc for each, lit in its own
 * colour once the traveller has finished a trip there, plus a gentle nudge towards the next
 * world to unlock at its best season.
 */
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { Passport } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { regionByKey } from '@/world/regions';

/** The seven worlds panel. `mine` adds the "Plan it" link. */
export function WorldsPanel({ passport, mine }: { passport: Passport; mine: boolean }) {
  const visited = passport.worlds.filter((w) => w.visited).length;
  const title = mine ? 'Your seven worlds' : 'Seven worlds';

  return (
    <section aria-label={title} className="glass-strong rounded-card p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-sm font-semibold text-soft">
          {visited} of 7{passport.abroadCount > 0 && ` · Beyond India ${passport.abroadCount}`}
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-7">
        {passport.worlds.map((world) => {
          const region = regionByKey(world.key);
          const colour = region?.ui.day[0] ?? '#4a6fa5';
          return (
            <li key={world.key} aria-label={`${world.name}: ${world.visited ? 'visited' : 'not yet'}`} className="flex flex-col items-center gap-2 text-center">
              <span
                aria-hidden
                className={cn('grid size-14 place-items-center rounded-full text-lg text-white transition sm:size-16', world.visited ? 'shadow-[0_0_0_5px_rgb(255_255_255/.6)]' : 'opacity-35 grayscale')}
                style={{ background: world.visited ? colour : '#9aa7b2' }}
                lang="hi"
              >
                {region?.hi.charAt(0) ?? '•'}
              </span>
              <span aria-hidden className={cn('text-xs leading-tight font-semibold', !world.visited && 'text-soft')}>
                {world.name}
              </span>
            </li>
          );
        })}
      </ul>

      {passport.nextWorld && (
        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-5 text-soft">
          <span aria-hidden>🧭</span>
          <span>{passport.nextWorld.line}</span>
          {mine && (
            <Link to={`/plan?destination=${encodeURIComponent(passport.nextWorld.suggest)}`} className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
              Plan {passport.nextWorld.suggest} <ArrowRight aria-hidden className="size-4" />
            </Link>
          )}
        </p>
      )}
    </section>
  );
}
