/**
 * ExplorePage.tsx — route "/explore": every destination as cinematic cards, with search
 * and filters (world, vibe, budget, best month) kept in the URL. Choosing a world also
 * turns the living landscape behind the page into that world (without overwriting the
 * traveller's own remembered pick).
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/features/explore/DestinationCard';
import { Filters, NO_FILTERS, type ExploreFilters } from '@/features/explore/Filters';
import { useDestinations } from '@/features/explore/hooks';
import type { BudgetTier, Vibe } from '@/lib/api/types';
import { regionByKey } from '@/world/regions';
import { useWorld } from '@/world/WorldProvider';

/** Filter names stored in the URL. */
const KEYS = Object.keys(NO_FILTERS) as (keyof ExploreFilters)[];

/** Route "/explore". */
export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<keyof ExploreFilters, string>;
  // The search box updates instantly; the URL (and the request) follow a moment later.
  const [q, setQ] = useState(filters.q);
  const { setRegion } = useWorld();

  /** Change some filters in the URL (empty values are dropped). */
  function writeUrl(next: Partial<ExploreFilters>) {
    const merged = { ...filters, ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)), { replace: true });
  }
  /** Change filters from the bar (search typing is debounced separately). */
  function update(next: Partial<ExploreFilters>) {
    if (next.q !== undefined) setQ(next.q);
    const { q: _typed, ...rest } = next;
    if (Object.keys(rest).length || next.q === '') writeUrl(next.q === '' ? next : rest);
  }

  // Debounced search → URL.
  useEffect(() => {
    if (q === (params.get('q') ?? '')) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (q) next.set('q', q);
      else next.delete('q');
      setParams(next, { replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, params, setParams]);

  // A chosen world shows on the living landscape.
  const world = regionByKey(filters.world);
  useEffect(() => {
    if (world) setRegion(world.key);
  }, [world, setRegion]);

  const { data, isPending, isError, refetch } = useDestinations({
    q: filters.q || undefined,
    vibe: (filters.vibe as Vibe) || undefined,
    budget: (filters.budget as BudgetTier) || undefined,
    month: Number(filters.month) || undefined,
  });
  // World is filtered here (the API doesn't know about the seven worlds).
  const results = data?.filter((d) => !filters.world || (filters.world === 'abroad' ? !d.region : d.region === filters.world));

  return (
    <div className="page-wrap pt-28 pb-16">
      <title>Explore destinations · TripWise</title>
      <header className="glass mb-6 inline-block rounded-[28px] px-7 py-5">
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">Seven worlds and beyond</p>
        <h1 className="mt-1 text-[clamp(40px,5vw,68px)]">
          Explore <em>where to go.</em>
        </h1>
      </header>

      <Filters value={{ ...filters, q }} onChange={update} />

      <div className="mt-8">
        {isPending && (
          <div role="status" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <span className="sr-only">Loading destinations…</span>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[420px]" />
            ))}
          </div>
        )}
        {isError && (
          <div className="glass-strong rounded-card p-8 text-center">
            <p className="text-lg font-semibold">Destinations are taking a breather.</p>
            <Button className="mt-4" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        )}
        {results && results.length === 0 && (
          <div className="glass-strong rounded-card p-10 text-center">
            <p className="font-display text-3xl">No places match those filters.</p>
            <p className="mt-2 text-soft">Try fewer filters, or another month.</p>
            <Button className="mt-5" onClick={() => update(NO_FILTERS)}>
              Clear filters
            </Button>
          </div>
        )}
        {results && results.length > 0 && (
          <ul aria-label="Destinations" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {results.map((destination) => (
              <li key={destination.id}>
                <DestinationCard destination={destination} className="h-[440px]" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
