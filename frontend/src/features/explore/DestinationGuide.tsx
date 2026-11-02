/**
 * DestinationGuide.tsx — the written guide on a destination page: About, History, Why it matters,
 * Things to do and Food to try, then the sources it was adapted from (Wikivoyage and Wikipedia,
 * CC BY-SA 4.0 — the licence asks us to credit them and link the licence). Places without a
 * guide yet show nothing.
 */
import { ExternalLink } from 'lucide-react';
import type { DestinationGuide as Guide } from '@/lib/api/types';

/** Where the CC BY-SA 4.0 licence lives. */
const LICENCE_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** A small label above a heading. */
const EYEBROW = 'text-xs font-bold tracking-[0.14em] text-soft uppercase';

/** One text part (History, Why it matters). */
function Part({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mt-2 leading-relaxed text-pretty text-soft">{text}</p>
    </div>
  );
}

/** One titled list (Things to do, Food to try). */
function Items({ title, items }: { title: string; items: { name: string; detail: string }[] }) {
  return (
    <div>
      <h3 className="font-display text-2xl">{title}</h3>
      <ul aria-label={title} className="mt-3 grid gap-3">
        {items.map((item) => (
          <li key={item.name} className="flex gap-3">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rotate-45 bg-accent" />
            <span>
              <span className="font-semibold">{item.name}</span>
              <span className="text-soft"> — {item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The guide section (nothing when there's no guide). */
export function DestinationGuide({ guide, name }: { guide: Guide | null | undefined; name: string }) {
  if (!guide) return null;
  const title = `About ${name}`;

  return (
    <section aria-label={title} className="glass-strong mt-6 rounded-[32px] p-[clamp(20px,3vw,40px)]">
      <p className={EYEBROW}>The guide</p>
      <h2 className="mt-2 text-[clamp(28px,3vw,44px)]">{title}</h2>
      {/* The about text keeps its paragraph breaks. */}
      <div className="mt-4 grid max-w-[75ch] gap-3 text-lg leading-relaxed text-pretty">
        {guide.about.split(/\n+/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Part title="History" text={guide.history} />
        <Part title="Why it matters" text={guide.significance} />
        <Items title="Things to do" items={guide.thingsToDo.map((t) => ({ name: t.title, detail: t.detail }))} />
        <Items title="Food to try" items={guide.food} />
      </div>

      {/* Credit, as the licence asks. */}
      <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-soft">
        <span>Text adapted from</span>
        {guide.sources.map((source, i) => (
          <span key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink">
              {source.title}
              <ExternalLink aria-hidden className="size-3" />
            </a>
            {i < guide.sources.length - 1 ? ',' : ''}
          </span>
        ))}
        <span>
          ·{' '}
          <a href={LICENCE_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            CC BY-SA 4.0
          </a>{' '}
          · checked {guide.checked}
        </span>
      </p>
    </section>
  );
}
