/**
 * InfoLayout.tsx — the shared layout of TripWise's information pages (About, Privacy, Terms,
 * Contact): one wide glass panel with a small label, the page heading, an opening line and an
 * optional "last updated" date; below, an "On this page" menu of the sections beside the text.
 * On large screens the menu sits on the left and stays in view while you read (sticky), and the
 * text keeps a comfortable line length; on phones the menu comes first, then the text.
 */
import { Children, isValidElement, type ReactNode } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';

/** A section title as an address fragment: "Your location" → "your-location". */
export const sectionId = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** An information page. */
export function InfoLayout({ eyebrow, title, tabTitle, lead, updated, children }: { eyebrow: string; title: string; tabTitle: string; lead: ReactNode; updated?: string; children: ReactNode }) {
  // The menu lists the page's sections, read from their titles.
  const titles = Children.toArray(children).flatMap((child) => (isValidElement<{ title?: string }>(child) && child.props.title ? [child.props.title] : []));

  return (
    <article className="page-wrap pt-28 pb-16">
      <title>{`${tabTitle} · TripWise`}</title>
      <GlassPanel className="mx-auto max-w-[1200px]">
        <header className="max-w-[72ch]">
          <p className="text-xs font-bold tracking-[0.14em] text-soft uppercase">{eyebrow}</p>
          <h1 className="mt-2 text-[clamp(36px,5vw,60px)] leading-[1.05]">{title}</h1>
          <div className="mt-4 text-lg leading-relaxed text-pretty">{lead}</div>
          {updated && <p className="mt-3 text-sm text-soft">Last updated {updated}</p>}
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          {/* Sections menu: first on phones, a sticky column beside the text on large screens. */}
          <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-bold tracking-[0.14em] text-soft uppercase">On this page</p>
            <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0.5 lg:border-l lg:border-line">
              {titles.map((t) => (
                <li key={t}>
                  <a
                    href={`#${sectionId(t)}`}
                    className="block rounded-full border border-line px-3 py-1 text-sm text-soft transition-colors hover:text-ink lg:-ml-px lg:rounded-none lg:border-0 lg:border-l-2 lg:border-transparent lg:py-1.5 lg:pl-4 lg:hover:border-accent"
                  >
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="grid max-w-[72ch] gap-9">{children}</div>
        </div>
      </GlassPanel>
    </article>
  );
}

/** One titled section (with an address the menu jumps to); its text keeps paragraphs and lists readable. */
export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section id={sectionId(title)} aria-label={title} className="scroll-mt-28">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-2 grid gap-3 leading-relaxed text-pretty text-soft [&_a]:text-ink [&_a]:underline [&_a]:decoration-accent [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}
