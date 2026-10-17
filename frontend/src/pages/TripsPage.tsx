/**
 * TripsPage.tsx — route "/trips" (logged-in): the traveller's trips. The next (or current)
 * trip gets a wide "Next trip" banner with its photo and countdown; below, upcoming and
 * past trips as ticket cards. Loading, empty ("No trips yet" → plan one) and error states.
 */
import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDestinations } from '@/features/explore/hooks';
import { rangeLabel, TRAVELLER_LABEL } from '@/features/trips/format';
import { useTrips } from '@/features/trips/hooks';
import { tripStatus } from '@/features/trips/status';
import { TripCard } from '@/features/trips/TripCard';
import type { Destination, Itinerary } from '@/lib/api/types';
import { sizedImage } from '@/lib/utils/images';

/** The wide banner for the trip coming up next. */
function NextTrip({ trip, destination }: { trip: Itinerary; destination?: Destination }) {
  const status = tripStatus(trip.request.startDate, trip.request.endDate);
  return (
    <section aria-label="Next trip" className="glass-strong mb-10 grid overflow-hidden rounded-4xl md:grid-cols-[1.1fr_1fr]">
      <div className="relative min-h-60 bg-accent/20">
        {destination && <img src={sizedImage(destination.image.url, 1200)} alt="" className="absolute inset-0 size-full object-cover" />}
        <span className="absolute top-4 left-4 rounded-full bg-accent px-3.5 py-1.5 font-semibold text-on-accent">{status.label}</span>
      </div>
      <div className="flex flex-col justify-center gap-3 p-7 sm:p-9">
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">{status.phase === 'ongoing' ? 'On the road' : 'Next trip'}</p>
        <h2 className="text-[clamp(32px,3.6vw,52px)]">{trip.title}</h2>
        <p className="text-soft">
          {rangeLabel(trip.request.startDate, trip.request.endDate)} · {TRAVELLER_LABEL[trip.request.travellers]}
        </p>
        <p className="max-w-[48ch]">{trip.summary}</p>
        <Link to={`/trips/${trip.id}`} className={buttonClasses({ className: 'mt-2 self-start' })}>
          Open itinerary <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/** A titled grid of trip cards. */
function TripGrid({ label, trips, place }: { label: string; trips: Itinerary[]; place: (name: string) => Destination | undefined }) {
  return (
    <section aria-label={label} className="mb-10">
      <h2 className="mb-4 text-xs font-bold tracking-[0.16em] text-ink uppercase [text-shadow:0_1px_8px_var(--trip-scrim)]">{label}</h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {trips.map((trip) => (
          <li key={trip.id}>
            <TripCard trip={trip} destination={place(trip.request.destination)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Route "/trips". */
export default function TripsPage() {
  const { data: trips, isPending, isError, refetch } = useTrips();
  const { data: destinations } = useDestinations();
  /** The destination record behind a trip (for its photo), if we know it. */
  const place = (name: string) => destinations?.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());

  // Soonest first for what's coming; most recent first for what's done.
  const byStart = [...(trips ?? [])].sort((a, b) => a.request.startDate.localeCompare(b.request.startDate));
  const coming = byStart.filter((t) => tripStatus(t.request.startDate, t.request.endDate).phase !== 'past');
  const past = byStart.filter((t) => tripStatus(t.request.startDate, t.request.endDate).phase === 'past').reverse();
  const [next, ...upcoming] = coming;

  return (
    <div className="page-wrap pt-28 pb-16">
      <title>My trips · TripWise</title>
      <PageHeader
        eyebrow="Planned with TripWise"
        title="My trips"
        lede={trips?.length ? `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} planned` : undefined}
        actions={
          <Link to="/plan" className={buttonClasses({ variant: 'glow', size: 'lg' })}>
            <Plus aria-hidden className="size-5" /> Plan a new trip
          </Link>
        }
      />

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
      {next && <NextTrip trip={next} destination={place(next.request.destination)} />}
      {upcoming.length > 0 && <TripGrid label="Also coming up" trips={upcoming} place={place} />}
      {past.length > 0 && <TripGrid label="Past trips" trips={past} place={place} />}
    </div>
  );
}
