/**
 * GlassPanel.tsx — a frosted pane that keeps text readable over scenery
 * (photos or the 3D world). Uses the `glass` utility from index.css.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('glass rounded-[28px] p-6 sm:p-9', className)}>{children}</div>;
}
