/**
 * usePrefersReducedMotion.ts — true when motion should be kept to a minimum: either the
 * user asked their OS for less motion, or chose "Calm" motion on their TripWise passport.
 *
 * Components use this to switch off timers and JS-driven animation (CSS animations
 * are stopped globally in index.css). It re-renders if either setting changes.
 */
import { useSyncExternalStore } from 'react';
import { motionPreference } from './motionPreference';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Subscribe to changes of the media query (no-op where matchMedia is missing). */
function subscribeOs(onChange: () => void) {
  const mql = window.matchMedia?.(QUERY);
  mql?.addEventListener?.('change', onChange);
  return () => mql?.removeEventListener?.('change', onChange);
}

/** Current value of the media query. */
function getOsSnapshot() {
  return window.matchMedia?.(QUERY).matches ?? false;
}

/** Non-hook check for code outside React (e.g. ref callbacks). */
export function prefersReducedMotion(): boolean {
  return getOsSnapshot() || motionPreference.get() === 'calm';
}

export function usePrefersReducedMotion(): boolean {
  const os = useSyncExternalStore(subscribeOs, getOsSnapshot, () => false);
  const calm = useSyncExternalStore(motionPreference.subscribe, () => motionPreference.get() === 'calm', () => false);
  return os || calm;
}
