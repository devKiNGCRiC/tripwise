/**
 * WorldStage.tsx — a full-screen stage for short pages (404, coming soon, errors,
 * admins only): the page's glass card centred over the living world, with room at
 * the top for the floating navbar.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function WorldStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex min-h-svh items-center px-4 pt-28 pb-20', className)}>
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </section>
  );
}
