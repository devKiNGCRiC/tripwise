/**
 * motionPreference.ts — the traveller's own "Calm motion" switch (set on the Passport page).
 *
 * 'calm' behaves like the OS "reduce motion" setting, but only for TripWise: the liquid
 * colour holds still, reveals and smooth scrolling switch off. Useful on slow phones or to
 * save battery. Stored in localStorage and mirrored on <html data-motion="…"> so CSS can
 * react too (index.html applies it before the first paint).
 */
export type MotionPreference = 'full' | 'calm';

/** localStorage key — must match the inline script in index.html. */
export const MOTION_STORAGE_KEY = 'tw_motion';

const listeners = new Set<() => void>();

/** Read the saved choice; anything else (or blocked storage) means 'full'. */
function read(): MotionPreference {
  try {
    return window.localStorage.getItem(MOTION_STORAGE_KEY) === 'calm' ? 'calm' : 'full';
  } catch {
    return 'full';
  }
}

let current: MotionPreference = typeof window === 'undefined' ? 'full' : read();

export const motionPreference = {
  /** Current choice (snapshot for useSyncExternalStore). */
  get: (): MotionPreference => current,

  /** Save a new choice, update <html data-motion>, and notify subscribers. */
  set(next: MotionPreference) {
    current = next;
    document.documentElement.dataset.motion = next;
    try {
      if (next === 'calm') window.localStorage.setItem(MOTION_STORAGE_KEY, 'calm');
      else window.localStorage.removeItem(MOTION_STORAGE_KEY);
    } catch {
      // Storage blocked: the choice still applies for this visit.
    }
    listeners.forEach((listener) => listener());
  },

  /** Listen for changes; returns the unsubscribe function. */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Re-read storage (tests clear localStorage between runs). */
  reset() {
    current = read();
  },
};
