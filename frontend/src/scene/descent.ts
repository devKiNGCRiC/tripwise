/**
 * descent.ts — shared state + maths for "The Descent".
 *
 * `descentProgress` is a tiny store (0 = top of the sky, 1 = touchdown) written
 * by the landing page's scroll tracking and read by the scenery and the altitude
 * meter. It lives outside React state so updating it 60× a second never
 * re-renders the page; readers subscribe (e.g. via useSyncExternalStore) or poll
 * it inside an animation frame.
 */

type Listener = () => void;

let value = 0;
const listeners = new Set<Listener>();

export const descentProgress = {
  /** Current progress, 0–1. */
  get(): number {
    return value;
  },
  /** Update progress (clamped to 0–1) and notify subscribers. */
  set(next: number) {
    const clamped = Math.min(1, Math.max(0, next));
    if (clamped === value) return;
    value = clamped;
    listeners.forEach((listener) => listener());
  },
  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** The six stages of the journey, evenly spaced along the scroll. */
export const STAGES = [
  { name: 'Sky', altitude: 9000 },
  { name: 'Glacier', altitude: 6000 },
  { name: 'Mountains', altitude: 3500 },
  { name: 'Waterfall', altitude: 1200 },
  { name: 'River', altitude: 200 },
  { name: 'Land', altitude: 0 },
] as const;

const LAST = STAGES.length - 1;

/** Metres above the valley floor for progress p (eases so the high part flies by faster). */
export function altitudeAt(p: number): number {
  const t = Math.min(1, Math.max(0, p));
  return Math.round(9000 * Math.pow(1 - t, 1.4));
}

/** The stage the traveller is closest to at progress p. */
export function stageAt(p: number) {
  return STAGES[Math.round(Math.min(1, Math.max(0, p)) * LAST)];
}

/**
 * Cross-fade weight of stage i at progress p: 1 when centred on it, fading
 * linearly to 0 at the neighbouring stages. Neighbouring weights always sum to 1.
 */
export function stageWeight(i: number, p: number): number {
  const position = Math.min(1, Math.max(0, p)) * LAST;
  return Math.max(0, 1 - Math.abs(position - i));
}
