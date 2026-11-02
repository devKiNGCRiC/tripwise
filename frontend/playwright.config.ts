/**
 * playwright.config.ts — end-to-end tests: the real website in a real browser, against the demo
 * API (MSW in the browser), so they need no backend, keys or network.
 *   npm run e2e                 uses the Edge already on Windows (nothing to download)
 *   PW_CHANNEL=chrome npm run e2e   or Chrome; PW_CHANNEL=chromium after `npx playwright install chromium`
 */
import { defineConfig } from '@playwright/test';

/** Where the test website runs. */
const PORT = 5199;
/** Which installed browser to drive. */
const channel = process.env.PW_CHANNEL ?? 'msedge';

export default defineConfig({
  testDir: './e2e',
  // One browser at a time: the demo API keeps its data in each page's memory.
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...(channel === 'chromium' ? {} : { channel }),
    trace: 'retain-on-failure',
  },
  // Start the website on its own port (the demo API is the default mode).
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
