/**
 * Footer.tsx — site footer: a kolam rule, the brand line, quick links, photo credit
 * and copyright. Extra bottom padding on mobile so the floating tab bar never covers it.
 */
import { Link } from 'react-router';
import { Kolam } from '@/components/signature/Kolam';
import { Logo } from './Logo';

/** Footer link: quiet text that warms to ink on hover. */
const LINK = 'w-fit text-ink-soft transition-colors hover:text-ink';

export function Footer() {
  return (
    <footer className="mt-auto pb-28 md:pb-0">
      <Kolam className="mx-auto w-[min(560px,80%)] opacity-70" />
      <div className="page-wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:items-start">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-ink-soft">Unhurried, day-by-day trip plans for every kind of traveller. Free, always.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          <Link to="/explore" className={LINK}>
            Explore destinations
          </Link>
          <Link to="/plan" className={LINK}>
            Plan a trip
          </Link>
          <Link to="/signup" className={LINK}>
            Create an account
          </Link>
        </nav>
        <div className="text-ink-soft">
          <p>
            Photos from{' '}
            <a href="https://unsplash.com" className="underline decoration-gold underline-offset-4" target="_blank" rel="noreferrer">
              Unsplash
            </a>
          </p>
          <p>
            © {new Date().getFullYear()} TripWise ·{' '}
            <span lang="hi" className="text-gold">
              शुभ यात्रा
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
