/**
 * PopularDestinations.tsx — five destination postcards from the API, in an
 * editorial layout: one wide featured card, then a row of tall ones.
 * Handles all three data states: loading (skeletons), error (retry), success.
 */
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/features/explore/DestinationCard';
import { useDestinations } from '@/features/explore/hooks';

export function PopularDestinations() {
  const { data, isPending, isError, refetch } = useDestinations();

  return (
    <section aria-labelledby="popular-heading" className="rangoli-dots bg-paper-2 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="popular-heading" className="text-[clamp(40px,5.6vw,76px)] [font-stretch:125%]">
              Where India is heading
            </h2>
            <p className="mt-4 max-w-[54ch] text-xl text-ink-soft">Every postcard opens a ready-made plan you can tweak.</p>
          </div>
          <Link to="/explore" className={buttonClasses({ variant: 'secondary' })}>
            See all destinations
          </Link>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {isPending &&
            Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className={i === 0 ? 'aspect-[16/9] sm:col-span-2' : 'aspect-[4/5]'} />
            ))}

          {isError && (
            <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border-[3px] border-dashed border-line/40 p-10 text-center">
              <p className="font-semibold">Destinations didn't load. Check your connection and try again.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}

          {data?.slice(0, 5).map((destination, i) => (
            <DestinationCard key={destination.id} destination={destination} featured={i === 0} className={i === 0 ? 'sm:col-span-2' : undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}
