/**
 * seed-destinations.ts — loads the 12 Explore destinations into MongoDB.
 *
 *   npm run seed        (uses MONGO_URI from .env)
 *
 * Safe to run again: each place is updated by its slug, never duplicated. The list in
 * src/data/destinations.json is the same one the website's mock uses.
 */
import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { Destination } from '../src/db/models/index.js';
import destinations from '../src/data/destinations.json' with { type: 'json' };

/** The catalogue (JSON gives plain strings; the model checks the allowed values on save). */
const catalogue = destinations as unknown as Array<{ slug: string } & Record<string, unknown>>;

/** Insert or update every destination; returns how many there are. Needs an open connection. */
export async function seedDestinations(): Promise<number> {
  await Destination.bulkWrite(
    catalogue.map((destination, order) => ({
      updateOne: { filter: { slug: destination.slug }, update: { $set: { ...destination, order } }, upsert: true },
    })),
  );
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
  console.log(`Seeded ${count} destinations into "${mongoose.connection.name}".`);
  await mongoose.disconnect();
}
