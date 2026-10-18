/**
 * passportData.ts — gathers a traveller's trips, journals and the catalogue from the
 * database and hands them to buildPassport (passport.ts), which does the actual work.
 * Used for your own passport and, with fewer details, for someone else's.
 */
import { Destination, Itinerary, Journal, type UserDoc } from '../db/models/index.js';
import { publicUser } from '../db/toPublic.js';
import { buildPassport, type JournalLike, type TripLike } from './passport.js';
import { istDay } from './quota.js';

/** Load everything and build the passport of `user`. */
export async function passportFor(user: UserDoc, now: Date, opts: { includeUpcoming: boolean; includeJournal: boolean }) {
  const [trips, destinations] = await Promise.all([
    Itinerary.find({ ownerId: user._id }, { request: 1, region: 1 }).lean(),
    Destination.find({}, { name: 1, country: 1, vibes: 1, region: 1, localName: 1 }).lean(),
  ]);
  const journals: JournalLike[] = await loadJournals(user._id.toString());

  // Every saved trip has its request; the filter only reassures TypeScript.
  const tripLikes: TripLike[] = trips.flatMap((t) =>
    t.request
      ? [
          {
            id: t._id.toString(),
            destination: t.request.destination,
            startDate: t.request.startDate,
            endDate: t.request.endDate,
            travellers: t.request.travellers,
            region: (t.region ?? null) as TripLike['region'],
          },
        ]
      : [],
  );

  return buildPassport({
    user: {
      name: user.name,
      username: user.username ?? '',
      avatarUrl: publicUser(user).avatarUrl,
      bio: user.bio ?? '',
      travellerType: user.travellerType ?? null,
      homeCity: user.homeCity ?? '',
      createdAt: (user.get('createdAt') as Date).toISOString(),
      theme: user.theme ?? null,
    },
    trips: tripLikes,
    journals,
    destinations: destinations.map((d) => ({ name: d.name, country: d.country, vibes: d.vibes ?? [], region: d.region ?? null, localName: d.localName ?? null })),
    today: istDay(now),
    ...opts,
  });
}

/** A traveller's journals in the passport's shape. */
async function loadJournals(ownerId: string): Promise<JournalLike[]> {
  const journals = await Journal.find({ ownerId }).lean();
  return journals.map((j) => ({
    itineraryId: j.itineraryId.toString(),
    rating: j.rating ?? null,
    memory: j.memory ?? '',
    photos: j.photos.map((p) => ({ id: p.id })),
    updatedAt: (j.updatedAt ?? new Date(0)).toISOString(),
  }));
}
