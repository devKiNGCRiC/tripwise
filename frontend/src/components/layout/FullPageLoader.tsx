/**
 * FullPageLoader.tsx — centred "plane in flight" loader used while auth restores
 * or a page chunk downloads. Has a screen-reader-only status message.
 */
import { Plane } from 'lucide-react';

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[50vh] place-items-center">
      <Plane className="size-10 animate-pulse text-green-deep" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
