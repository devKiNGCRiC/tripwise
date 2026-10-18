/**
 * server.ts — starts the TripWise API for real: read settings, connect to MongoDB,
 * then listen for requests. (Tests use app.ts directly and never run this file.)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { buildChain } from './services/ai/index.js';

/** Start everything; exit with a clear message if it can't. */
async function main() {
  const env = loadEnv();

  // Connect to the database first, so the API never answers without it.
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log(`[api] MongoDB connected (database "${mongoose.connection.name}")`);

  // The AI fallback chain (Gemini first, Groq as backup), built from the keys in .env.
  const ai = buildChain(env);

  const app = createApp({ ai, clientOrigin: env.CLIENT_ORIGIN });
  app.listen(env.PORT, () => console.log(`[api] TripWise API on :${env.PORT}`));
}

main().catch((error: unknown) => {
  console.error('[api] could not start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
