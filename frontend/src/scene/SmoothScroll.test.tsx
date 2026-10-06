/**
 * SmoothScroll.test.tsx — inertial scrolling is on for most people, but never
 * for users who asked their OS for reduced motion.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Fake Lenis so the test doesn't depend on real scrolling (jsdom has no layout).
const created = vi.fn();
vi.mock('lenis', () => ({
  default: class {
    constructor() {
      created();
    }
    on() {}
    raf() {}
    destroy() {}
  },
}));

import { SmoothScroll } from './SmoothScroll';

/** Make the stubbed matchMedia report reduced motion on or off. */
function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

describe('SmoothScroll', () => {
  afterEach(() => created.mockClear());

  it('turns on smooth scrolling and renders its children', () => {
    setReducedMotion(false);
    render(
      <SmoothScroll>
        <p>page</p>
      </SmoothScroll>,
    );
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(created).toHaveBeenCalledOnce();
  });

  it('keeps native scrolling for reduced-motion users', () => {
    setReducedMotion(true);
    render(
      <SmoothScroll>
        <p>page</p>
      </SmoothScroll>,
    );
    expect(created).not.toHaveBeenCalled();
  });
});
