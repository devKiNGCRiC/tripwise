/**
 * vitest.config.ts — how the backend tests run.
 * Tests use an in-memory MongoDB and fake AI providers, so they never touch Atlas,
 * Gemini or Groq. The database start-up can take a few seconds the first time, hence
 * the longer timeouts.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Fixed fake settings so tests never read the real .env.
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://placeholder/test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-0123',
    },
    testTimeout: 20_000,
    hookTimeout: 60_000,
    // Each file gets its own in-memory database; running files one after another keeps memory low.
    fileParallelism: false,
  },
});
