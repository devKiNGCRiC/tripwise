/**
 * InfoLayout.tsx — the shared layout of TripWise's information pages (About, Privacy, Terms,
 * Contact): one glass panel with a small label, the page heading, an opening line, an optional
 * "last updated" date, and titled sections in comfortable reading width.
 */
import type { ReactNode } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';

/** An information page. */
export function InfoLayout({ eyebrow, title, tabTitle, lead, updated, children }: { eyebrow: string; title: string; tabTitle: string; lead: ReactNode; updated?: string; children: ReactNode }) {
  return (
    <article className="page-wrap pt-28 pb-16">
      <title>{`${tabTitle} · TripWise`}</title>
      <GlassPanel className="mx-auto max-w-[860px]">
        <p className="text-xs font-bold tracking-[0.14em] text-soft uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-[clamp(36px,5vw,56px)] leading-[1.05]">{title}</h1>
        <div className="mt-4 text-lg leading-relaxed text-pretty">{lead}</div>
        {updated && <p className="mt-3 text-sm text-soft">Last updated {updated}</p>}
        <div className="mt-8 grid gap-8">{children}</div>
      </GlassPanel>
    </article>
  );
}

/** One titled section; its text keeps paragraphs and lists readable. */
export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-2 grid gap-3 leading-relaxed text-pretty text-soft [&_a]:text-ink [&_a]:underline [&_a]:decoration-accent [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}
