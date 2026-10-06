/**
 * DepartureBoard.test.tsx — the railway-board headline: shows a stop, flips to the
 * next one on a timer, and stays still for people who ask for reduced motion.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DepartureBoard } from './DepartureBoard';

const STOPS = [
  { name: 'Goa', localName: 'गोवा' },
  { name: 'Manali', localName: 'मनाली' },
];

/** Make the (stubbed) matchMedia report whether the user prefers reduced motion. */
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

describe('DepartureBoard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces the first stop with its local name', () => {
    render(<DepartureBoard stops={STOPS} />);
    expect(screen.getByText('Next stop: Goa (गोवा)')).toBeInTheDocument();
    expect(screen.getByText('गोवा')).toBeInTheDocument();
  });

  it('flips to the next stop after the interval', () => {
    render(<DepartureBoard stops={STOPS} intervalMs={3000} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('Next stop: Manali (मनाली)')).toBeInTheDocument();
  });

  it('stays on the first stop when the user prefers reduced motion', () => {
    setReducedMotion(true);
    render(<DepartureBoard stops={STOPS} intervalMs={3000} />);
    act(() => {
      vi.advanceTimersByTime(9000);
    });
    expect(screen.getByText('Next stop: Goa (गोवा)')).toBeInTheDocument();
  });
});
