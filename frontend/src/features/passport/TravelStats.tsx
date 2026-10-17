/**
 * TravelStats.tsx — the traveller's numbers at a glance, in the passport header:
 * trips planned, how many of India's seven worlds they cover, and days on the road.
 */
import { useDestinations } from '@/features/explore/hooks';
import { useTrips } from '@/features/trips/hooks';

/** Trips, worlds and days. */
export function TravelStats() {
  const { data: trips } = useTrips();
  const { data: destinations } = useDestinations();
  if (!trips) return null;
  const regionOf = (name: string) => destinations?.find((d) => d.name.toLowerCase() === name.trim().toLowerCase())?.region;
  const worlds = new Set(trips.map((t) => regionOf(t.request.destination)).filter(Boolean)).size;
  const days = trips.reduce((sum, t) => sum + t.days.length, 0);
  const stats: [number, string][] = [
    [trips.length, 'Trips planned'],
    [worlds, 'Worlds explored'],
    [days, 'Days on the road'],
  ];

  return (
    <ul aria-label="Travel stats" className="flex gap-2">
      {stats.map(([value, label]) => (
        <li key={label} className="min-w-24 rounded-2xl bg-ink/5 px-4 py-2.5 text-center">
          <span className="block font-display text-3xl leading-tight">{value}</span>
          <span className="text-xs font-semibold text-soft">{label}</span>
        </li>
      ))}
    </ul>
  );
}
