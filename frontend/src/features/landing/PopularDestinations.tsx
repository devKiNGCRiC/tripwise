/**
 * PopularDestinations.tsx — Stage 3, the Mountains: destination postcards from
 * the API (one wide featured card, two tall ones). Handles loading (skeletons),
 * error (retry) and success.
 */
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/features/explore/DestinationCard';
import { useDestinations } from '@/features/explore/hooks';
import { DescentStage, GlassPanel } from './DescentStage';

export function PopularDestinations() {
  const { data, isPending, isError, refetch } = useDestinations();

  return (
    <DescentStage name="Mountains" side="right">
      <GlassPanel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[clamp(34px,4.6vw,62px)] font-stretch-125%">Where India is heading</h2>
            <p className="mt-3 text-lg text-ink-soft">Every postcard opens a ready-made plan you can tweak.</p>
          </div>
          <Link to="/explore" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            See all destinations
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {isPending && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className={i === 0 ? 'aspect-video sm:col-span-2' : 'aspect-4/5'} />)}

          {isError && (
            <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border-[3px] border-dashed border-line/40 p-8 text-center">
              <p className="font-semibold">Destinations didn't load. Check your connection and try again.</p>
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          )}

          {data?.slice(0, 3).map((destination, i) => (
            <DestinationCard key={destination.id} destination={destination} featured={i === 0} className={i === 0 ? 'sm:col-span-2' : undefined} />
          ))}
        </div>
      </GlassPanel>
    </DescentStage>
  );
}
