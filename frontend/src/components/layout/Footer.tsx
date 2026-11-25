/**
 * Footer.tsx — site footer: a glass bar over the living world with the brand line,
 * quick links, photo credit and copyright. Extra bottom space on mobile so the
 * floating tab bar never covers it.
 */
import { Link } from 'react-router';
import { BRAND } from '@/lib/brand';
import { Logo } from './Logo';

/** Footer link: quiet text that warms to ink on hover. */
const LINK = 'w-fit text-soft transition-colors hover:text-ink';

/** The glass site footer. */
export function Footer() {
  return (
    <footer className="page-wrap mt-auto pt-10 pb-28 md:pb-8">
      <div className="glass grid gap-8 rounded-[28px] px-6 py-8 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] md:items-start">
        <div>
          <Logo />
          {/* The slogan, in English and Hindi. */}
          <p className="mt-3 font-display text-lg">
            <span>{BRAND.slogan}</span> <span aria-hidden>·</span>{' '}
            <span lang="hi" className="font-hindi text-accent">
              {BRAND.sloganHi}
            </span>
          </p>
          <p className="mt-1 max-w-xs text-soft">Trips across India's seven worlds — and the rest of the planet — planned around you. Free, always.</p>
        </div>
        {/* Two link groups side by side: getting around, and about TripWise. */}
        <div className="grid grid-cols-2 gap-6">
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
          <nav aria-label="About TripWise" className="flex flex-col gap-2">
            {[
              ['About', '/about'],
              ['Privacy', '/privacy'],
              ['Terms', '/terms'],
              ['Contact', '/contact'],
            ].map(([label, to]) => (
              <Link key={to} to={to} className={LINK}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="text-soft">
          <p>Every landscape here is drawn live in your browser.</p>
          <p>
            Region photos from{' '}
            <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer" className="underline decoration-accent underline-offset-4">
              Wikimedia Commons
            </a>{' '}
            (credited on each photo)
          </p>
          <p>
            © {new Date().getFullYear()} TripWise ·{' '}
            <span lang="hi" className="text-accent">
              {BRAND.signOff}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
