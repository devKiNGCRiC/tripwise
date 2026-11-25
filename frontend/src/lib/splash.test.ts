/**
 * splash.test.ts — the splash screen (drawn by index.html) leaves once the app has started:
 *   - it fades out, then is removed from the page
 *   - with calm motion (or the system's reduced-motion setting) it goes at once, with no fade
 *   - with no splash on the page, nothing happens
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hideSplash } from './splash';

/** Put a splash on the page, the way index.html does. */
function addSplash() {
  document.body.insertAdjacentHTML('afterbegin', '<div id="splash" aria-hidden="true">TripWise</div>');
}

afterEach(() => {
  document.getElementById('splash')?.remove();
  delete document.documentElement.dataset.motion;
  vi.useRealTimers();
});

describe('hideSplash', () => {
  it('fades the splash out, then removes it', () => {
    vi.useFakeTimers();
    addSplash();
    hideSplash();
    expect(document.getElementById('splash')).toHaveClass('is-leaving');
    vi.advanceTimersByTime(500);
    expect(document.getElementById('splash')).toBeNull();
  });

  it('removes it at once with calm motion', () => {
    addSplash();
    document.documentElement.dataset.motion = 'calm';
    hideSplash();
    expect(document.getElementById('splash')).toBeNull();
  });

  it('does nothing when there is no splash', () => {
    expect(() => hideSplash()).not.toThrow();
  });
});
