/**
 * social.ts (mock data) — the demo world around the profiles: a few trips (some finished,
 * one coming up), a written journal with photos, and friendships. Dates are worked out from
 * today, so the demo always has finished trips and an upcoming one.
 */
import type { Destination, Interest, Pace, Travellers, TripRequest } from '@/lib/api/types';
import type { StoredItinerary } from '../db';
import { seedDestinations } from './destinations';
import { generateItinerary } from './generator';

/** A journal as the mock keeps it. */
export interface MockJournal {
  itineraryId: string;
  ownerId: string;
  rating: number | null;
  memory: string;
  photos: { id: string; width: number; height: number; alt: string }[];
  updatedAt: string;
}

/** A stored photo: an uploaded image, or a link for the seeded ones. */
export interface MockPhoto {
  ownerId: string;
  itineraryId: string;
  blob?: Blob;
  href?: string;
}

/** A friend request or friendship. */
export interface MockFriendship {
  id: string;
  requester: string;
  recipient: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

/** "YYYY-MM-DD" n days from today (local time). */
export function dayFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One seeded trip, built by the demo planner. */
function seedTrip(id: string, ownerId: string, place: string, from: number, to: number, travellers: Travellers, interests: Interest[], pace: Pace = 'balanced'): StoredItinerary {
  const destination = seedDestinations.find((d) => d.name === place) as Destination;
  const request: TripRequest = { destination: place, startDate: dayFromToday(from), endDate: dayFromToday(to), budget: { amount: 3500, currency: 'INR' }, travellers, interests, pace };
  return {
    ...generateItinerary(request, destination),
    id,
    ownerId,
    region: destination.country === 'India' ? (destination.region ?? null) : 'abroad',
    createdAt: new Date(Date.now() + (from - 30) * 86_400_000).toISOString(),
  };
}

/** Every seeded trip. */
export function seedTrips(): StoredItinerary[] {
  return [
    seedTrip('it_seed_goa', 'u_demo', 'Goa', -40, -37, 'couple', ['food', 'relaxation']),
    seedTrip('it_seed_jaipur', 'u_demo', 'Jaipur', -20, -18, 'couple', ['history', 'food']),
    seedTrip('it_seed_kerala', 'u_demo', 'Kerala Backwaters', 12, 15, 'couple', ['nature', 'food'], 'chill'),
    seedTrip('it_seed_varanasi', 'u_meera', 'Varanasi', -60, -57, 'solo', ['spiritual', 'culture']),
    seedTrip('it_seed_manali', 'u_meera', 'Manali', -120, -114, 'friends', ['adventure', 'nature']),
    seedTrip('it_seed_ladakh', 'u_kabir', 'Ladakh', -80, -73, 'friends', ['adventure', 'photography'], 'packed'),
  ];
}

/** Seeded journals (photos point at the destination pictures). */
export function seedJournals(): MockJournal[] {
  return [
    {
      itineraryId: 'it_seed_goa',
      ownerId: 'u_demo',
      rating: 5,
      memory: 'Sunsets at Palolem, bebinca at every café and an evening in Fontainhas we will never forget.',
      photos: [
        { id: 'ph_seed_goa_1', width: 1600, height: 1067, alt: 'Palm trees over a Goa beach' },
        { id: 'ph_seed_goa_2', width: 1600, height: 1067, alt: 'A colourful street in Fontainhas' },
      ],
      updatedAt: new Date(Date.now() - 35 * 86_400_000).toISOString(),
    },
    {
      itineraryId: 'it_seed_varanasi',
      ownerId: 'u_meera',
      rating: 4,
      memory: 'The Ganga aarti from a boat at dusk. Chaotic, loud and the most peaceful hour of my year.',
      photos: [{ id: 'ph_seed_varanasi_1', width: 1600, height: 1067, alt: 'Boats on the Ganga at Varanasi' }],
      updatedAt: new Date(Date.now() - 55 * 86_400_000).toISOString(),
    },
  ];
}

/** Seeded photos: links to the destinations' own pictures. */
export function seedPhotos(): Record<string, MockPhoto> {
  const image = (name: string) => `${seedDestinations.find((d) => d.name === name)!.image.url}?w=1600&q=80`;
  return {
    ph_seed_goa_1: { ownerId: 'u_demo', itineraryId: 'it_seed_goa', href: image('Goa') },
    ph_seed_goa_2: { ownerId: 'u_demo', itineraryId: 'it_seed_goa', href: image('Goa') },
    ph_seed_varanasi_1: { ownerId: 'u_meera', itineraryId: 'it_seed_varanasi', href: image('Varanasi') },
  };
}

/** Seeded friendships: Demo ↔ Kabir, Zoya asked Demo, Demo asked Dev. */
export function seedFriendships(): MockFriendship[] {
  const at = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  return [
    { id: 'fr_seed_kabir', requester: 'u_kabir', recipient: 'u_demo', status: 'accepted', createdAt: at(30) },
    { id: 'fr_seed_zoya', requester: 'u_zoya', recipient: 'u_demo', status: 'pending', createdAt: at(2) },
    { id: 'fr_seed_dev', requester: 'u_demo', recipient: 'u_dev', status: 'pending', createdAt: at(1) },
  ];
}
