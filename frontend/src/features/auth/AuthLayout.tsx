/**
 * AuthLayout.tsx — shared look for /login and /signup.
 *
 * Left: a card whose header is a bilingual station board — "Arrivals / आगमन" for
 *       people coming back (login), "Departures / प्रस्थान" for new travellers (signup).
 * Right (desktop only): a slice of the kite-festival sky with a one-line promise.
 */
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { FestivalSky } from '@/components/signature/FestivalSky';

interface AuthLayoutProps {
  /** Board header, English, e.g. "Arrivals". */
  board: string;
  /** Board header in Hindi, e.g. "आगमन". */
  boardLocal: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("New here? Sign up") */
  footer: ReactNode;
}

export function AuthLayout({ board, boardLocal, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="rangoli-dots">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
        <Card className="mx-auto w-full max-w-md overflow-hidden">
          {/* Station-board header: always black on yellow */}
          <div className="flex items-baseline justify-between border-b-[3px] border-black bg-yellow px-6 py-3 text-black">
            <span className="font-display text-xl font-black uppercase font-stretch-130%">{board}</span>
            <span lang="hi" className="text-xl font-extrabold">
              {boardLocal}
            </span>
          </div>
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <header>
              <h1 className="text-4xl font-stretch-115%">{title}</h1>
              <p className="mt-2 text-ink-soft">{subtitle}</p>
            </header>
            {children}
            <div className="text-center text-ink-soft">{footer}</div>
          </div>
        </Card>

        {/* Decorative sky panel — hidden from screen readers and on small screens */}
        <div aria-hidden className="sky-fill relative hidden h-128 overflow-hidden rounded-card border-[3px] border-line shadow-pop md:block">
          <FestivalSky />
          <p className="absolute inset-x-10 bottom-12 z-10 font-display text-5xl leading-none font-black text-black font-stretch-120% dark:text-white">
            Collect places, not things.
          </p>
        </div>
      </div>
    </div>
  );
}
