/**
 * Footer.tsx — site footer: brand line, quick links, photo credit and copyright.
 * Festival bunting on top ties it to the rest of the page. Extra bottom padding
 * on mobile so the tab bar never covers it.
 */
import { Link } from 'react-router';
import { Bunting } from '@/components/signature/Bunting';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-auto bg-paper-2 pb-24 md:pb-0">
      <Bunting />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr] md:items-start">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-ink-soft">AI-planned trips for wanderers on any budget. Free, always.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 font-semibold">
          <Link to="/explore" className="w-fit hover:underline">
            Explore destinations
          </Link>
          <Link to="/plan" className="w-fit hover:underline">
            Plan a trip
          </Link>
          <Link to="/signup" className="w-fit hover:underline">
            Create an account
          </Link>
        </nav>
        <div className="text-ink-soft">
          <p>
            Photos from{' '}
            <a href="https://unsplash.com" className="underline" target="_blank" rel="noreferrer">
              Unsplash
            </a>
          </p>
          <p>© {new Date().getFullYear()} TripWise</p>
        </div>
      </div>
    </footer>
  );
}
