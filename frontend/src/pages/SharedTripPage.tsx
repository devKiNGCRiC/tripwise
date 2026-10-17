/**
 * SharedTripPage.tsx — route "/t/:shareId" (public): a trip someone shared, read-only —
 * no delete, no regenerate — with an invitation to plan your own (pre-filled with the same
 * destination). Unknown or removed links get a kind "isn't available" message.
 */
import { Sparkles } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { WorldStage } from '@/components/layout/WorldStage';
import { LoadError } from '@/components/layout/LoadError';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSharedTrip } from '@/features/trips/hooks';
import { ItineraryView } from '@/features/trips/ItineraryView';
import { useTripWorld } from '@/features/trips/useTripWorld';
import { ApiError } from '@/lib/api/errors';

/** Route "/t/:shareId". */
export default function SharedTripPage() {
  const { shareId = '' } = useParams();
  const { data: itinerary, isPending, isError, error, refetch } = useSharedTrip(shareId);
  const place = useTripWorld(itinerary?.request.destination);

  if (isPending) {
    return (
      <div role="status" className="page-wrap grid gap-5 pt-28 pb-16">
        <span className="sr-only">Loading the shared trip…</span>
        <Skeleton className="h-60" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (isError && !(error instanceof ApiError && error.code === 'NOT_FOUND')) {
    return <LoadError what="this shared trip" onRetry={() => void refetch()} />;
  }
  if (isError || !itinerary) {
    return (
      <WorldStage>
        <title>Shared trip not available · TripWise</title>
        <GlassPanel className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-[clamp(32px,4.5vw,52px)]">This shared trip isn't available</h1>
          <p className="text-soft">The link may be wrong, or the trip was deleted. You can still plan one of your own.</p>
          <Link to="/plan" className={buttonClasses()}>
            Plan a trip
          </Link>
        </GlassPanel>
      </WorldStage>
    );
  }

  return (
    <div className="page-wrap pt-28 pb-16">
      <title>{`${itinerary.title} (shared) · TripWise`}</title>
      <ItineraryView
        itinerary={itinerary}
        place={place}
        actions={
          <>
            <p className="self-center text-soft">Shared with you — read-only.</p>
            <Link to={`/plan?destination=${encodeURIComponent(itinerary.request.destination)}`} className={buttonClasses({ variant: 'glow', className: 'ml-auto' })}>
              <Sparkles aria-hidden className="size-4" /> Plan your own trip
            </Link>
          </>
        }
      />
    </div>
  );
}
