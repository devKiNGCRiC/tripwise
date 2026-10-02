/**
 * Footer.tsx — site footer with quick links, photo credit and copyright.
 * Extra bottom padding on mobile so the tab bar never covers it.
 */
import { Link } from 'react-router';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-line bg-paper-2 pb-24 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-ink-soft">AI-planned trips for wanderers on any budget. Free, always.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <Link to="/explore" className="hover:underline">
            Explore
          </Link>
          <Link to="/plan" className="hover:underline">
            Plan a trip
          </Link>
          <Link to="/signup" className="hover:underline">
            Create account
          </Link>
        </nav>
        <p className="font-mono text-xs text-ink-soft">
          Photos:{' '}
          <a href="https://unsplash.com" className="underline" target="_blank" rel="noreferrer">
            Unsplash
          </a>{' '}
          · © {new Date().getFullYear()} TripWise
        </p>
      </div>
    </footer>
  );
}
