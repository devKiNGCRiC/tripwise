/**
 * setup.ts — runs before every test file.
 * Adds DOM matchers (toBeInTheDocument, …) and unmounts components after each test
 * so tests never leak into each other.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

/**
 * Finish every Motion animation instantly in tests: exit animations would
 * otherwise keep removed elements in the DOM while jsdom "animates" them.
 */
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
