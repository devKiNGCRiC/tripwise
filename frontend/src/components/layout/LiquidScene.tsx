/**
 * LiquidScene.tsx — a full-screen stage for short pages (404, coming soon, errors,
 * admins only): living liquid colour behind, a slowly turning rangoli at the edge,
 * and the page's glass card centred on top.
 */
import type { ReactNode } from 'react';
import { LiquidCanvas } from '@/components/signature/LiquidCanvas';
import { Rangoli } from '@/components/signature/Rangoli';
import { cn } from '@/lib/utils/cn';

export function LiquidScene({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('relative isolate flex min-h-svh items-center overflow-hidden px-4 pt-28 pb-20', className)}>
      <LiquidCanvas />
      <Rangoli className="pointer-events-none absolute top-1/2 -right-48 w-[640px] -translate-y-1/2 opacity-40 max-md:hidden" />
      {/* Melt into the page colour at the bottom, where the footer begins */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-paper" />
      <div className="relative mx-auto w-full max-w-xl">{children}</div>
    </section>
  );
}
