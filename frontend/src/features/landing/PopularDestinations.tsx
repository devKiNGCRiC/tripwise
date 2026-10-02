/**
 * PopularDestinations.tsx — six destination postcards from the API.
 * Handles all three data states: loading (skeletons), error (retry), success.
 */
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/features/explore/DestinationCard';
import { useDestinations } from '@/features/explore/hooks';

export function PopularDestinations() {
  const { data, isPending, isError, refetch } = useDestinations();

  return (
    <section aria-labelledby="popular-heading" className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="popular-heading" className="text-4xl font-extrabold sm:text-5xl">
            Trending right now
          </h2>
          <p className="mt-2 text-ink-soft">Where TripWise travellers are heading this season.</p>
        </div>
        <Link to="/explore" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
          See all <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Loading: six card-shaped skeletons so the layout doesn't jump. */}
        {isPending &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-card border-2 border-line/20 p-3">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="mt-3 h-6 w-1/2" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          ))}

        {/* Error: friendly message + retry instead of an empty section. */}
        {isError && (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-line/40 p-10 text-center">
            <p className="font-semibold">We couldn’t load destinations right now.</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {data?.slice(0, 6).map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>
    </section>
  );
}
