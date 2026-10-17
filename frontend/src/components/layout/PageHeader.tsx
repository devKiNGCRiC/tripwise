/**
 * PageHeader.tsx — the slim, consistent top of every inner page: a small eyebrow, the page
 * title in the editorial serif (an optional italic accent), a line of context, and room on
 * the right for the page's main action. Sits on a soft glass band so it reads over any
 * landscape, and lines up with the content below it.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  /** Italic accent phrase after the title ("where to go.") */
  accent?: string;
  /** A short line under the title */
  lede?: ReactNode;
  /** Buttons on the right (main action) */
  actions?: ReactNode;
  className?: string;
}

/** An inner page's header. */
export function PageHeader({ eyebrow, title, accent, lede, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('glass mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 rounded-[28px] px-6 py-5 sm:px-8', className)}>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">{eyebrow}</p>
        <h1 className="mt-1 text-[clamp(34px,4vw,56px)]">
          {title}
          {accent && (
            <>
              {' '}
              <em>{accent}</em>
            </>
          )}
        </h1>
        {lede && <p className="mt-1.5 max-w-[60ch] text-soft">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </header>
  );
}
