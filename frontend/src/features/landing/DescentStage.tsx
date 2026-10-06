/**
 * DescentStage.tsx — one full-screen stop on the way down (Sky, Glacier, …).
 * Places its content to one side so the scenery stays visible beside it, and
 * reveals the content as it scrolls into view.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useReveal } from '@/lib/useReveal';

interface DescentStageProps {
  /** Stage name, also used as a data attribute for tests and analytics. */
  name: string;
  /** Which side the content sits on, leaving the other side for the view. */
  side?: 'left' | 'right' | 'center';
  children: ReactNode;
  className?: string;
}

export function DescentStage({ name, side = 'left', children, className }: DescentStageProps) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <section data-descent-stage={name} className={cn('relative flex min-h-[100svh] items-center py-24', className)}>
      <div className="mx-auto w-full max-w-6xl px-4">
        <div
          ref={ref}
          className={cn(side === 'right' && 'ml-auto', side === 'center' && 'mx-auto text-center', side !== 'center' && 'max-w-3xl')}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/** Re-exported for the landing stages, which always pair a stage with a glass pane. */
export { GlassPanel } from '@/components/ui/GlassPanel';
