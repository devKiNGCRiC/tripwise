/**
 * TripCard.tsx — a saved trip on My trips: a ticket-shaped glass card with the
 * destination's photo (or its world's photo), the title, dates and day count.
 * The whole card opens the trip.
 */
import { Link } from 'react-router';
import type { Destination, Itinerary } from '@/lib/api/types';
import { sizedImage } from '@/lib/utils/images';
import { regionByKey } from '@/world/regions';
import { rangeLabel, TRAVELLER_LABEL } from './format';

/** One saved trip. */
export function TripCard({ trip, destination }: { trip: Itinerary; destination?: Destination }) {
  const photo = destination ? sizedImage(destination.image.url, 700) : (regionByKey('himalaya')?.photo.src ?? '');
  return (
    <Link to={`/trips/${trip.id}`} className="group glass-strong block overflow-hidden rounded-card transition hover:-translate-y-1">
      <div className="relative h-44 overflow-hidden">
        <img src={photo} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <span className="absolute top-3 left-3 rounded-full bg-black/40 px-3 py-1 text-sm font-semibold text-white backdrop-blur-md">
          {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
        </span>
      </div>
      {/* Ticket perforation */}
      <div aria-hidden className="border-t-2 border-dashed border-line" />
      <div className="p-5">
        <h2 className="text-2xl">{trip.title}</h2>
        <p className="mt-1 text-sm text-soft">
          {rangeLabel(trip.request.startDate, trip.request.endDate)} · {TRAVELLER_LABEL[trip.request.travellers]}
        </p>
      </div>
    </Link>
  );
}
