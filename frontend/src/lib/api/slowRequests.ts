/**
 * slowRequests.ts — counts API calls that have been waiting longer than ~3s.
 *
 * Why: our free Render backend sleeps when idle and takes ~30s to wake.
 * The client bumps this counter for slow calls; <ServerWakingBanner> reads it
 * (via React's useSyncExternalStore) and explains the wait instead of leaving
 * users staring at a spinner.
 */
type Listener = () => void;

let count = 0;
const listeners = new Set<Listener>();

export const slowRequests = {
  /** +1 when a request turns slow, -1 when that slow request finishes. Never below 0. */
  add(delta: number) {
    count = Math.max(0, count + delta);
    listeners.forEach((listener) => listener());
  },
  /** Current number of slow in-flight requests. */
  getSnapshot(): number {
    return count;
  },
  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
