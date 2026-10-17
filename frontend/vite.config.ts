/**
 * vite.config.ts — build + dev-server + test-runner configuration.
 *
 * Vite serves the app in development and bundles it for production.
 * Vitest (our unit-test runner) reads the `test` section of this same file,
 * so the app and its tests share one set of plugins and path aliases.
 */
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // React (JSX + fast refresh) and Tailwind CSS v4 (utility classes) plugins.
  plugins: [react(), tailwindcss()],

  // `@/` points at `src/` — must match "paths" in tsconfig.json.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  // The PDF maker (@react-pdf/renderer, ~1.2 MB) is its own chunk, downloaded only when a
  // traveller presses "Download PDF" — so a larger warning limit for that one file is fine.
  build: { chunkSizeWarningLimit: 1300 },

  // Unit tests run in jsdom (a fake browser) with shared setup (matchers, mock API).
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Generous per-test limit: a cold first run on a slow machine (lazy routes, MSW, jsdom) can take >5s.
    testTimeout: 15_000,
  },
});
