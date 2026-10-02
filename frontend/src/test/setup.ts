/**
 * setup.ts — runs before every test file.
 * Adds DOM matchers (toBeInTheDocument, …) and unmounts components after each test
 * so tests never leak into each other.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
