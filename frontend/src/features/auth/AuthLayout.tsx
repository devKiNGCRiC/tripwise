/**
 * AuthLayout.tsx — shared look for /login and /signup.
 * Left: a "boarding pass" card holding the form. Right (desktop only): an aurora
 * panel with passport stamps — the Passport Pop identity at first touch.
 */
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

interface AuthLayoutProps {
  /** Small mono label on the ticket header, e.g. "BOARDING PASS · LOGIN" */
  ticketLabel: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("New here? Sign up") */
  footer: ReactNode;
}

export function AuthLayout({ ticketLabel, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <Card className="mx-auto w-full max-w-md overflow-hidden">
        {/* Ticket header strip */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-line/40 bg-mustard px-6 py-3 text-on-accent">
          <span className="font-mono text-xs font-bold tracking-[0.2em]">{ticketLabel}</span>
          <span className="font-mono text-xs font-bold">TW · 2026</span>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <header>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
            <p className="mt-2 text-ink-soft">{subtitle}</p>
          </header>
          {children}
          <div className="text-center text-sm text-ink-soft">{footer}</div>
        </div>
      </Card>

      {/* Decorative side panel — hidden from screen readers and on small screens */}
      <div aria-hidden className="relative hidden h-[30rem] overflow-hidden rounded-card border-2 border-line shadow-pop md:block">
        <div className="aurora-fill absolute inset-0" />
        <div className="absolute inset-0 grid place-items-center p-10 text-center text-white">
          <div>
            <p className="font-display text-5xl leading-none font-extrabold">
              Collect places,
              <br />
              not things.
            </p>
            <p className="mt-4 font-mono text-sm tracking-widest opacity-90">EVERY TRIP = A NEW STAMP</p>
          </div>
        </div>
        <span className="absolute top-8 left-8 -rotate-12 rounded-full border-4 border-double border-white/80 px-4 py-2 font-mono text-sm font-bold text-white">
          GOA ✓
        </span>
        <span className="absolute right-10 bottom-10 rotate-6 rounded-full border-4 border-double border-white/80 px-4 py-2 font-mono text-sm font-bold text-white">
          TOKYO ✓
        </span>
      </div>
    </div>
  );
}
