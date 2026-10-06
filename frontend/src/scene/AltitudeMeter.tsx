/**
 * AltitudeMeter.tsx — the descent's progress indicator: altitude counting down
 * from 9,000 m to 0 m, a saffron fill line, and the current stage name.
 * Decorative (aria-hidden): the page content itself carries the meaning.
 */
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils/cn';
import { altitudeAt, descentProgress, stageAt } from './descent';

export function AltitudeMeter({ className }: { className?: string }) {
  const progress = useSyncExternalStore(descentProgress.subscribe, descentProgress.get, descentProgress.get);

  return (
    <div aria-hidden="true" className={cn('pointer-events-none fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 text-right text-white md:block', className)}>
      <p className="font-display text-2xl font-black font-stretch-120% [text-shadow:0_2px_14px_rgb(0_0_0/.45)]">
        {altitudeAt(progress).toLocaleString('en-IN')} m
      </p>
      <p className="mt-1 text-sm font-semibold opacity-90 [text-shadow:0_1px_8px_rgb(0_0_0/.5)]">{stageAt(progress).name}</p>
      <div className="relative mt-3 ml-auto h-56 w-1 overflow-hidden rounded-full bg-white/25">
        <span className="absolute inset-x-0 top-0 rounded-full bg-[linear-gradient(var(--trip-saffron),var(--trip-yellow))]" style={{ height: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
