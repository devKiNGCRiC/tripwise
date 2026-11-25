/**
 * vite.config.ts — build + dev-server + test-runner configuration.
 *
 * Vite serves the app in development and bundles it for production.
 * Vitest (our unit-test runner) reads the `test` section of this same file,
 * so the app and its tests share one set of plugins and path aliases.
 */
/// <reference types="vitest/config" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { publicPages, renderPage, robotsTxt, sitemapXml, type SeoDestination, type SeoGuide } from './src/lib/seo/pages';

/** The live site's address (set VITE_SITE_URL when deploying; this is the expected default). */
const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://tripwise.pages.dev').replace(/\/$/, '');

/**
 * After a production build, write a ready-made page for every public address (home, Explore, info
 * pages, every destination with its guide), plus sitemap.xml and robots.txt — so search engines and
 * link previews see real titles, descriptions and text (src/lib/seo/pages.ts builds them).
 */
function seoPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const data = (file: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../backend/src/data/${file}`, import.meta.url)), 'utf8'));
      const destinations = data('destinations.json') as SeoDestination[];
      const guides = data('guides.json').guides as Record<string, SeoGuide>;
      const template = readFileSync(join(outDir, 'index.html'), 'utf8');
      const pages = publicPages(destinations, guides);
      for (const page of pages) {
        // "/" stays index.html; "/explore" becomes explore/index.html (served for /explore).
        const file = page.path === '/' ? join(outDir, 'index.html') : join(outDir, page.path, 'index.html');
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, renderPage(template, page, SITE_URL));
      }
      writeFileSync(join(outDir, 'sitemap.xml'), sitemapXml(pages, SITE_URL, new Date().toISOString().slice(0, 10)));
      writeFileSync(join(outDir, 'robots.txt'), robotsTxt(SITE_URL));
      console.log(`seo-pages: ${pages.length} pages, sitemap.xml and robots.txt for ${SITE_URL}`);
    },
  };
}

export default defineConfig({
  // React (JSX + fast refresh) and Tailwind CSS v4 (utility classes) plugins.
  plugins: [react(), tailwindcss(), seoPages()],

  // `@/` points at `src/`; `@catalogue/` at the backend's catalogue files (destinations and
  // places), `@planner` at TripWise's own planner, `@toli-rules` at the Toli rules and `@lekha-rules` at the
  // Toli's money maths and `@yatra-rules` at the on-the-trip rules, so the
  // mock API serves exactly the real data and follows exactly the same rules. All must match "paths" in tsconfig.json.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@catalogue': fileURLToPath(new URL('../backend/src/data', import.meta.url)),
      '@planner': fileURLToPath(new URL('../backend/src/services/localPlanner.ts', import.meta.url)),
      '@toli-rules': fileURLToPath(new URL('../backend/src/services/toliRules.ts', import.meta.url)),
      '@lekha-rules': fileURLToPath(new URL('../backend/src/services/lekhaRules.ts', import.meta.url)),
      '@yatra-rules': fileURLToPath(new URL('../backend/src/services/yatraRules.ts', import.meta.url)),
    },
  },

  // The PDF maker (@react-pdf/renderer, ~1.2 MB) is its own chunk, downloaded only when a
  // traveller presses "Download PDF" — so a larger warning limit for that one file is fine.
  build: { chunkSizeWarningLimit: 1300 },

  // In development, "/api" goes to the real backend on port 4000 (when VITE_USE_MOCKS=false).
  // Same-origin like production (Cloudflare forwards /api to Render), so the login cookie works.
  server: { proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } } },

  // Unit tests run in jsdom (a fake browser) with shared setup (matchers, mock API).
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Generous per-test limit: a cold first run on a slow machine (lazy routes, MSW, jsdom) can take >5s.
    testTimeout: 15_000,
  },
});
