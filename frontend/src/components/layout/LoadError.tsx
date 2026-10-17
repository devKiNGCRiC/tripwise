/**
 * LoadError.tsx — "We couldn't load this trip": shown when a page's data fails for a reason
 * other than "not found" (server down, network gone), with a Try again button — so a
 * temporary problem is never mistaken for a deleted trip.
 */
import { WorldStage } from './WorldStage';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';

/** A friendly load-failure card; `what` names the thing, e.g. "this trip". */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <WorldStage>
      <GlassPanel className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-[clamp(32px,4.5vw,52px)]">We couldn't load {what}</h1>
        <p className="text-soft">The connection may have dropped, or our server is waking up. It usually works on the next try.</p>
        <Button onClick={onRetry}>Try again</Button>
      </GlassPanel>
    </WorldStage>
  );
}
