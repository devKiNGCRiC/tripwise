/**
 * setup.ts — runs before every test file.
 *  - DOM matchers (toBeInTheDocument, …)
 *  - the MSW mock API, reset after each test so tests never leak data into each other
 *  - stubs for browser APIs jsdom lacks (matchMedia, scrollTo)
 *  - Motion animations finish instantly
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { api } from '@/lib/api/client';
import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/node';

// Start intercepting fetch before any test runs.
beforeAll(() => server.listen());

// After each test: unmount UI, drop per-test handler overrides, restore seed data, clear storage.
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  localStorage.clear();
  api.setAccessToken(null);
});

afterAll(() => server.close());

/** Finish every Motion animation instantly so exit animations don't linger in jsdom. */
MotionGlobalConfig.skipAnimations = true;

/**
 * jsdom has no window.matchMedia. Components ask it about the OS colour scheme
 * and reduced-motion preference, so we stub it to "no preference" (matches: false).
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

/** jsdom doesn't implement scrolling; React Router's scroll restoration calls it. */
window.scrollTo = () => {};
