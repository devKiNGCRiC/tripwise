/**
 * seed-destinations.ts — loads the Explore catalogue into MongoDB: the destinations and
 * their places (src/data/places.json, from scripts/import-catalogue.ts).
 *
 *   npm run seed        (uses MONGO_URI from .env)
 *
 * Safe to run again: each destination is updated by its slug and each place by its id,
 * never duplicated; places no longer in the catalogue are removed. The same JSON files feed
 * the website's mock, so real and demo data match.
 */
import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { Destination, Place, type PlaceFields } from '../src/db/models/index.js';
import destinations from '../src/data/destinations.json' with { type: 'json' };
import placesFile from '../src/data/places.json' with { type: 'json' };

/** The catalogue (JSON gives plain strings; the model checks the allowed values on save). */
const catalogue = destinations as unknown as Array<{ slug: string } & Record<string, unknown>>;

/** Every place (plain JSON). */
const places = placesFile.places as PlaceFields[];

/** Insert or update every destination and place; returns how many destinations. Needs an open connection. */
export async function seedDestinations(): Promise<number> {
  await Destination.bulkWrite(
    catalogue.map((destination, order) => ({
      updateOne: { filter: { slug: destination.slug }, update: { $set: { ...destination, order } }, upsert: true },
    })),
  );
  await Place.bulkWrite(places.map((place) => ({ replaceOne: { filter: { id: place.id }, replacement: place, upsert: true } })));
  // Places dropped from the catalogue go too.
  await Place.deleteMany({ id: { $nin: places.map((p) => p.id) } });
  return catalogue.length;
}

// Run directly from the command line: connect, seed, disconnect.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing from .env');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const count = await seedDestinations();
  console.log(`Seeded ${count} destinations and ${places.length} places into "${mongoose.connection.name}".`);
  await mongoose.disconnect();
}
