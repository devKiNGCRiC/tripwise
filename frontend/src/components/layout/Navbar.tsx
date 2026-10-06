/**
 * Navbar.tsx — sticky top bar.
 * Desktop: logo, main links, theme toggle, account area.
 * Mobile: just logo + theme toggle + account (main links live in MobileTabBar).
 */
import { NavLink } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/theme/ThemeToggle';
import { Logo } from './Logo';

/** Desktop nav link: yellow station-board pill when active, soft highlight on hover. */
function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-full px-3 py-1.5 font-display font-bold transition focus-visible:outline-3 focus-visible:outline-sky-deep',
    isActive ? 'bg-yellow text-on-accent' : 'hover:bg-ink/5',
  );
}

/** Two-letter initials for the avatar bubble. */
function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Navbar() {
  const { user, status } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-line bg-paper/85 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/explore" className={navLinkClass}>
            Explore
          </NavLink>
          <NavLink to="/plan" className={navLinkClass}>
            Plan a trip
          </NavLink>
          {user && (
            <NavLink to="/trips" className={navLinkClass}>
              My trips
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* While auth is restoring, render nothing here to avoid a login-button flash. */}
          {status === 'authenticated' && user && (
            <NavLink
              to="/passport"
              aria-label="Your passport"
              className="grid size-10 place-items-center rounded-full border-2 border-line bg-yellow font-display text-sm font-extrabold text-on-accent shadow-pop-sm"
            >
              {initials(user.name)}
            </NavLink>
          )}
          {status === 'guest' && (
            <>
              {/* Wrapper does the hiding: buttonClasses always sets inline-flex, which would fight a `hidden` class. */}
              <span className="hidden sm:block">
                <NavLink to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                  Log in
                </NavLink>
              </span>
              <NavLink to="/signup" className={buttonClasses({ size: 'sm' })}>
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
