/**
 * ServerWakingBanner.tsx — friendly heads-up during Render free-tier cold starts.
 * Subscribes to the api client's slow-request counter; shows while it's > 0.
 */
import { Plane } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { slowRequests } from '@/lib/api/slowRequests';

export function ServerWakingBanner() {
  const slowCount = useSyncExternalStore(slowRequests.subscribe, slowRequests.getSnapshot);
  if (slowCount === 0) return null;

  return (
    <div role="status" className="sticky top-0 z-50 border-b-2 border-line bg-yellow px-4 py-2 text-center text-sm font-semibold text-on-accent">
      <Plane className="mr-2 inline size-4 animate-bounce" aria-hidden />
      Waking up the TripWise server… free servers nap when idle, this can take up to 30 seconds.
    </div>
  );
}
