/**
 * setup.ts — runs before every test file.
 *  - DOM matchers (toBeInTheDocument, …)
 *  - the MSW mock API, reset after each test so tests never leak data into each other
 *  - stubs for browser APIs jsdom lacks (matchMedia, scrollTo)
 *  - a fresh motion preference (Calm/Full) for every test
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { api } from '@/lib/api/client';
import { motionPreference } from '@/lib/motionPreference';
import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/node';

/**
 * findBy… queries and waitFor wait up to 8s (default 1s). The first lazy-loaded page in each test
 * file is compiled on demand; with the whole suite running in parallel that can take ~5s on a
 * busy machine — shorter limits made tests fail at random.
 */
configure({ asyncUtilTimeout: 8000 });

// Start intercepting fetch before any test runs.
beforeAll(() => server.listen());

// After each test: unmount UI, drop per-test handler overrides, restore seed data, clear storage.
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  localStorage.clear();
  motionPreference.reset();
  delete document.documentElement.dataset.motion;
  api.setAccessToken(null);
});

afterAll(() => server.close());

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

/**
 * jsdom has no canvas drawing and logs a noisy "not implemented" error when asked.
 * Report "no context" instead — the same path a browser without WebGL takes (CSS gradient fallback).
 */
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
