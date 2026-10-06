/**
 * usePrefersReducedMotion.ts — true when the user asked their OS for less motion.
 *
 * Components use this to switch off timers and JS-driven animation (CSS animations
 * are already stopped globally in index.css). It re-renders if the setting changes.
 */
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Subscribe to changes of the media query (no-op where matchMedia is missing). */
function subscribe(onChange: () => void) {
  const mql = window.matchMedia?.(QUERY);
  mql?.addEventListener?.('change', onChange);
  return () => mql?.removeEventListener?.('change', onChange);
}

/** Current value of the media query. */
function getSnapshot() {
  return window.matchMedia?.(QUERY).matches ?? false;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
