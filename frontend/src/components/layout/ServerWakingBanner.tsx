/**
 * ServerWakingBanner.tsx — friendly heads-up during Render free-tier cold starts.
 * Subscribes to the api client's slow-request counter; shows while it's > 0.
 * A slim strip in the region colour, pinned above the floating navbar.
 */
import { useSyncExternalStore } from 'react';
import { slowRequests } from '@/lib/api/slowRequests';

/** Cold-start heads-up banner. */
export function ServerWakingBanner() {
  const slowCount = useSyncExternalStore(slowRequests.subscribe, slowRequests.getSnapshot);
  if (slowCount === 0) return null;

  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 bg-accent px-4 py-1.5 text-center text-sm font-medium text-on-accent">
      <span aria-hidden className="mr-2 inline-block size-2 animate-pulse rounded-full bg-current" />
      Waking up the TripWise server… free servers nap when idle, this can take up to 30 seconds.
    </div>
  );
}
