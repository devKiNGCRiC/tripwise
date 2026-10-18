/**
 * db.ts (test helper) — a throw-away MongoDB that lives only in memory, so tests never
 * touch Atlas. Each test file starts one, empties it between tests and stops it at the end:
 *
 *   beforeAll(startTestDb); afterEach(clearTestDb); afterAll(stopTestDb);
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

/** The running in-memory server (one per test file). */
let server: MongoMemoryServer | undefined;

/** Start the database and connect Mongoose to it; builds indexes so unique rules apply. */
export async function startTestDb(): Promise<void> {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(), { dbName: 'tripwise-test' });
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
}

/** Empty every collection (keeps indexes) so each test starts clean. */
export async function clearTestDb(): Promise<void> {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

/** Disconnect and shut the database down. */
export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  await server?.stop();
}
