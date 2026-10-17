/**
 * AuthLayout.tsx — shared look for /login and /signup.
 *
 * Living liquid colour fills the page. On desktop, the promise sits on the left in
 * the editorial serif beside a turning rangoli; the form floats on the right on strong
 * glass. The card opens with a bilingual eyebrow — "Arrivals / आगमन" for people coming
 * back, "Departures / प्रस्थान" for new travellers.
 */
import type { ReactNode } from 'react';
import { LiquidCanvas } from '@/components/signature/LiquidCanvas';
import { Rangoli } from '@/components/signature/Rangoli';
import { Card } from '@/components/ui/Card';

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
  return (
    <section className="relative isolate overflow-hidden">
      <LiquidCanvas />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-paper" />

      <div className="page-wrap relative grid min-h-svh items-center gap-12 pt-28 pb-20 lg:grid-cols-[1fr_minmax(0,460px)]">
        {/* The promise, beside the form (desktop only) */}
        <div aria-hidden className="relative hidden lg:block">
          <Rangoli className="absolute -top-24 -left-24 -z-10 w-[520px] opacity-40" />
          <p lang="hi" className="text-2xl text-gold">
            जगहें इकट्ठा करो
          </p>
          <p className="mt-3 font-display text-[clamp(56px,6vw,92px)] leading-[0.95]">
            Collect places,
            <br />
            <em className="font-hindi">not things.</em>
          </p>
        </div>

        <Card className="w-full p-7 sm:p-9">
          <p className="flex items-baseline justify-between text-sm font-medium tracking-[0.2em] text-ink-soft uppercase">
            {eyebrow}
            <span lang="hi" className="text-xl tracking-normal text-gold normal-case">
              {eyebrowLocal}
            </span>
          </p>
          <header className="mt-5">
            <h1 className="text-[44px]">{title}</h1>
            <p className="mt-2 text-ink-soft">{subtitle}</p>
          </header>
          <div className="mt-7 flex flex-col gap-5">
            {children}
            <div className="text-center text-ink-soft">{footer}</div>
          </div>
        </Card>
      </div>
    </section>
  );
}
