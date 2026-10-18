/**
 * TripCard.tsx — a saved trip on My trips, ticket-shaped: the destination's photo with its
 * Hindi name and a status chip ("In 31 days", "Happening now", "Past trip"), a perforated
 * edge, then the title, dates and who's going. The whole card opens the trip.
 */
import { Link } from 'react-router';
import type { Destination, Itinerary } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { sizedImage } from '@/lib/utils/images';
import { rangeLabel, TRAVELLER_LABEL } from './format';
import { PlaceCard } from './PlaceCard';
import { tripStatus } from './status';

/** One saved trip. */
export function TripCard({ trip, destination }: { trip: Itinerary; destination?: Destination }) {
  const status = tripStatus(trip.request.startDate, trip.request.endDate);
  return (
    <Link to={`/trips/${trip.id}`} className={cn('group glass-strong block overflow-hidden rounded-card transition hover:-translate-y-1', status.phase === 'past' && 'opacity-85')}>
      <div className="relative h-48 overflow-hidden bg-accent/20">
        {destination ? (
          <img src={sizedImage(destination.image.url, 700)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <PlaceCard name={trip.request.destination} className="[&>span:last-child]:text-4xl" />
        )}
        <span aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent from-50% to-black/45" />
        <span className={cn('absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-semibold backdrop-blur-md', status.phase === 'past' ? 'bg-black/40 text-white' : 'bg-accent text-on-accent')}>
          {status.label}
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-black/40 px-3 py-1 text-sm font-semibold text-white backdrop-blur-md">
          {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
        </span>
        {destination?.localName && (
          <span lang="hi" className="absolute bottom-3 left-4 text-2xl text-white [text-shadow:0_2px_10px_rgb(0_0_0/.5)]">
            {destination.localName}
          </span>
        )}
      </div>
      {/* Ticket perforation */}
      <div aria-hidden className="border-t-2 border-dashed border-line" />
      <div className="p-5">
        <h3 className="text-2xl">{trip.title}</h3>
        <p className="mt-1 text-sm text-soft">
          {rangeLabel(trip.request.startDate, trip.request.endDate)} · {TRAVELLER_LABEL[trip.request.travellers]}
        </p>
      </div>
    </Link>
  );
}
