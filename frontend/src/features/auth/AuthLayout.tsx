/**
 * AuthLayout.tsx — shared look for /login and /signup.
 *
 * The living world shows through the whole page. On desktop, the promise sits on the
 * left in Fraunces over a soft scrim, beside the name of the region on screen; the form
 * floats on the right on strong glass. The card opens with a bilingual eyebrow —
 * "Arrivals / आगमन" for people coming back, "Departures / प्रस्थान" for new travellers.
 */
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { useWorld } from '@/world/WorldProvider';

interface AuthLayoutProps {
  /** Eyebrow, English, e.g. "Arrivals". */
  eyebrow: string;
  /** Eyebrow in Hindi, e.g. "आगमन". */
  eyebrowLocal: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("New here? Sign up") */
  footer: ReactNode;
}

export function AuthLayout({ eyebrow, eyebrowLocal, title, subtitle, children, footer }: AuthLayoutProps) {
  const { region } = useWorld();

  return (
    <section className="relative isolate">
      {/* Readability wash behind the promise (desktop) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden bg-linear-to-r from-(--trip-scrim) to-transparent to-60% lg:block" />

      <div className="page-wrap grid min-h-svh items-center gap-12 pt-28 pb-20 lg:grid-cols-[1fr_minmax(0,460px)]">
        {/* The promise, beside the form (desktop only) */}
        <div aria-hidden className="hidden lg:block">
          <p className="text-[11px] font-bold tracking-[0.18em] text-soft uppercase">
            Now showing · {region.name}{' '}
            <span lang="hi" className="text-lg tracking-normal text-accent-2 normal-case">
              {region.hi}
            </span>
          </p>
          <p className="mt-4 font-display text-[clamp(56px,6vw,96px)] leading-[0.95] font-semibold tracking-tight">
            Collect places,
            <br />
            <em className="font-normal text-accent">not things.</em>
          </p>
          <p lang="hi" className="mt-4 text-2xl text-accent-2">
            जगहें इकट्ठा करो, चीज़ें नहीं
          </p>
        </div>

        <Card className="w-full p-7 sm:p-9">
          <p className="flex items-baseline justify-between text-[11px] font-bold tracking-[0.2em] text-soft uppercase">
            {eyebrow}
            <span lang="hi" className="text-xl tracking-normal text-accent-2 normal-case">
              {eyebrowLocal}
            </span>
          </p>
          <header className="mt-5">
            <h1 className="text-[44px]">{title}</h1>
            <p className="mt-2 text-soft">{subtitle}</p>
          </header>
          <div className="mt-7 flex flex-col gap-5">
            {children}
            <div className="text-center text-soft">{footer}</div>
          </div>
        </Card>
      </div>
    </section>
  );
}
