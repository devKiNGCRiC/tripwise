/**
 * StampGrid.tsx — the passport's stamp page: one ink stamp per planned trip (place name,
 * its Hindi name when we know it), each tilted a little differently like real stamps,
 * linking to the trip. While loading it shows a placeholder (never a false "no stamps");
 * with no trips yet it invites the traveller to plan the first one.
 */
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Stamp, type StampTone } from '@/components/ui/Stamp';
import { useDestinations } from '@/features/explore/hooks';
import { useTrips } from '@/features/trips/hooks';

/** Stamp inks, tilts and nudges, cycled so the page looks hand-stamped, not gridded. */
const TONES: StampTone[] = ['teal', 'gold', 'red'];
const TILTS = [-9, 6, -4, 11, -12, 3];
const NUDGES = ['translate-y-2', '-translate-y-3', 'translate-y-4 -translate-x-2', '-translate-y-1 translate-x-3', 'translate-y-3', '-translate-y-4'];

/** The stamp page. */
export function StampGrid() {
  const { data: trips, isPending } = useTrips();
  const { data: destinations } = useDestinations();

  if (isPending) {
    return (
      <div role="status" className="flex gap-4">
        <span className="sr-only">Loading your stamps…</span>
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="size-24 rounded-full" />
      </div>
    );
  }
  if (!trips || trips.length === 0) {
    return (
      <>
        <div aria-hidden className="grid size-24 place-items-center rounded-full border-2 border-dashed border-accent-2/60 font-display text-sm tracking-widest text-accent-2 uppercase">
          Your
          <br />
          stamp
        </div>
        <h2 className="text-3xl">No stamps yet</h2>
        <p className="max-w-[32ch] text-soft">Every trip you plan lands here as a stamp. Where's the first one going to be?</p>
        <Link to="/plan" className={buttonClasses()}>
          Plan your first trip
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="text-3xl">
        {trips.length} {trips.length === 1 ? 'stamp' : 'stamps'} collected
      </h2>
      <ul aria-label="Stamps" className="flex flex-wrap justify-center gap-x-6 gap-y-8 py-2">
        {trips.map((trip, i) => {
          const place = trip.request.destination;
          const local = destinations?.find((d) => d.name.toLowerCase() === place.trim().toLowerCase())?.localName;
          return (
            <li key={trip.id}>
              <Link to={`/trips/${trip.id}`} aria-label={`${place} — ${trip.title}`} className={`block rounded-full opacity-90 mix-blend-multiply transition hover:scale-105 hover:opacity-100 dark:mix-blend-normal ${NUDGES[i % NUDGES.length]}`}>
                <Stamp size="lg" label={place} localLabel={local} tone={TONES[i % TONES.length]} rotate={TILTS[i % TILTS.length]} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
