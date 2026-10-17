/**
 * TripPage.tsx — route "/trips/:id" (the owner only): the full itinerary with its actions —
 * a fresh take on any single day, and delete (after confirming, then back to My trips).
 * Share and PDF buttons join the header via TripActions. Missing or someone else's trip
 * shows "Trip not found". The trip's world appears on the living landscape.
 */
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { WorldStage } from '@/components/layout/WorldStage';
import { LoadError } from '@/components/layout/LoadError';
import { Button, buttonClasses } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useDeleteTrip, useRegenerateDay, useTrip } from '@/features/trips/hooks';
import { ItineraryView } from '@/features/trips/ItineraryView';
import { TripActions } from '@/features/trips/TripActions';
import { useTripWorld } from '@/features/trips/useTripWorld';
import { ApiError } from '@/lib/api/errors';

/** Route "/trips/:id". */
export default function TripPage() {
  const { id = '' } = useParams();
  const { data: itinerary, isPending, isError, error, refetch } = useTrip(id);
  const regenerate = useRegenerateDay(id);
  const remove = useDeleteTrip(id);
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  useTripWorld(itinerary?.request.destination);

  if (isPending) {
    return (
      <div role="status" className="page-wrap grid gap-5 pt-28 pb-16">
        <span className="sr-only">Loading your trip…</span>
        <Skeleton className="h-60" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (isError && !(error instanceof ApiError && error.code === 'NOT_FOUND')) {
    return <LoadError what="this trip" onRetry={() => void refetch()} />;
  }
  if (isError || !itinerary) {
    return (
      <WorldStage>
        <title>Trip not found · TripWise</title>
        <GlassPanel className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-[clamp(36px,5vw,56px)]">Trip not found</h1>
          <p className="text-soft">It may have been deleted, or it belongs to someone else.</p>
          <Link to="/trips" className={buttonClasses()}>
            Back to my trips
          </Link>
        </GlassPanel>
      </WorldStage>
    );
  }

  return (
    <div className="page-wrap pt-28 pb-16">
      <title>{`${itinerary.title} · TripWise`}</title>
      <Link to="/trips" className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-glass px-3 py-1.5 text-sm font-semibold backdrop-blur-md hover:text-accent">
        <ArrowLeft aria-hidden className="size-4" /> All my trips
      </Link>
      <ItineraryView
        itinerary={itinerary}
        onRegenerateDay={(day) => regenerate.mutate(day, { onError: () => toast.show({ title: "Couldn't refresh that day — try again.", tone: 'error' }) })}
        regeneratingDay={regenerate.isPending ? regenerate.variables : null}
        actions={
          <>
            <TripActions itinerary={itinerary} />
            <Button variant="ghost" className="ml-auto text-danger" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setConfirming(true)}>
              Delete trip
            </Button>
          </>
        }
      />
      {confirming && (
        <ConfirmDialog
          title="Delete this trip?"
          confirmLabel="Delete"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() =>
            remove.mutate(undefined, {
              onSuccess: () => {
                toast.show({ title: 'Trip deleted', tone: 'info' });
                navigate('/trips', { replace: true });
              },
              onError: () => {
                setConfirming(false);
                toast.show({ title: "Couldn't delete the trip — try again.", tone: 'error' });
              },
            })
          }
        >
          “{itinerary.title}” will be gone for good, along with its share link.
        </ConfirmDialog>
      )}
    </div>
  );
}
