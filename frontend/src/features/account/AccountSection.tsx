/**
 * AccountSection.tsx — one titled glass panel on the Account tab ("Profile", "Privacy" …).
 * It is a labelled region, so screen-reader users can jump between sections.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** A section of the Account tab. */
export function AccountSection({ title, lede, children, tone }: { title: string; lede?: string; children: ReactNode; tone?: 'danger' }) {
  return (
    <section aria-label={title} className={cn('glass-strong rounded-card p-6 sm:p-8', tone === 'danger' && 'ring-1 ring-danger/40')}>
      <h2 className={cn('font-display text-2xl', tone === 'danger' && 'text-danger')}>{title}</h2>
      {lede && <p className="mt-1 text-soft">{lede}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A small error line for server answers. */
export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
      {message}
    </p>
  ) : null;
}
