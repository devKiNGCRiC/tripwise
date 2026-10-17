/**
 * TripsPage.tsx — route "/trips" (logged-in): every trip the traveller has planned, as
 * ticket cards, newest first. Loading, empty ("No trips yet" → plan one) and error states.
 */
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDestinations } from '@/features/explore/hooks';
import { useTrips } from '@/features/trips/hooks';
import { TripCard } from '@/features/trips/TripCard';

/** Route "/trips". */
export default function TripsPage() {
  const { data: trips, isPending, isError, refetch } = useTrips();
  const { data: destinations } = useDestinations();
  /** The destination record behind a trip (for its photo), if we know it. */
  const destinationOf = (name: string) => destinations?.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

  return (
    <div className="page-wrap pt-28 pb-16">
      <title>My trips · TripWise</title>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <header className="glass inline-block rounded-[28px] px-7 py-5">
          <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">Planned with TripWise</p>
          <h1 className="mt-1 text-[clamp(40px,5vw,68px)]">My trips</h1>
        </header>
        <Link to="/plan" className={buttonClasses({ variant: 'glow', size: 'lg' })}>
          <Plus aria-hidden className="size-5" /> Plan a new trip
        </Link>
      </div>

      {isPending && (
        <div role="status" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Loading your trips…</span>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      )}
      {isError && (
        <GlassPanel className="text-center">
          <p className="text-lg font-semibold">We couldn't load your trips.</p>
          <Button className="mt-4" onClick={() => void refetch()}>
            Try again
          </Button>
        </GlassPanel>
      )}
      {trips && trips.length === 0 && (
        <GlassPanel className="flex flex-col items-center gap-3 text-center">
          <p className="font-display text-4xl">No trips yet</p>
          <p className="max-w-[40ch] text-soft">Tell us where and when — your first day-by-day plan is a minute away.</p>
          <Link to="/plan" className={buttonClasses({ className: 'mt-2' })}>
            Plan your first trip
          </Link>
        </GlassPanel>
      )}
      {trips && trips.length > 0 && (
        <ul aria-label="Trips" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} destination={destinationOf(trip.request.destination)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
