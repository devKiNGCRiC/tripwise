/**
 * GlassPanel.tsx — a roomy frosted pane for content floating over the living world.
 * Uses the `glass-strong` utility from index.css so text stays crisp over busy colour.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function GlassPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('glass-strong rounded-card p-6 sm:p-10', className)}>{children}</div>;
}
