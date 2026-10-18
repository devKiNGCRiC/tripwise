/**
 * Navbar.tsx — a floating glass pill at the top of every page.
 * Desktop: logo, main links, Day/Night switch, account area.
 * Mobile: logo + switch + account (main links live in MobileTabBar).
 * It floats over the content (fixed), so pages leave room at the top for it.
 */
import { Link, NavLink } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useFriends } from '@/features/friends/hooks';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/theme/ThemeToggle';
import { Logo } from './Logo';

/** Desktop nav link: an underline in the region colour grows under the active/hovered link. */
function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'relative rounded-full px-3 py-1.5 font-medium transition-colors',
    'after:absolute after:inset-x-3 after:bottom-0.5 after:h-px after:origin-left after:bg-accent after:transition-transform after:duration-500 after:ease-out-expo',
    isActive ? 'text-ink after:scale-x-100' : 'text-soft after:scale-x-0 hover:text-ink hover:after:scale-x-100',
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

/** The floating glass navigation bar. */
export function Navbar() {
  const { user, status } = useAuth();
  // Friend requests waiting for an answer (a dot on your passport bubble).
  const waiting = useFriends().data?.incoming.length ?? 0;

  return (
    <header className="fixed inset-x-0 top-3 z-40 sm:top-3.5">
      <div className="page-wrap max-sm:px-3">
        <nav aria-label="Main" className="glass flex h-[62px] items-center justify-between gap-3 rounded-full pr-2.5 pl-5 sm:pl-6">
          <Logo />

          <div className="hidden items-center gap-1 md:flex">
            <NavLink to="/explore" className={navLinkClass}>
              Explore
            </NavLink>
            <NavLink to="/plan" className={navLinkClass}>
              Plan a trip
            </NavLink>
            {/* A section of the homepage: in-app navigation (no reload); the homepage glides to it */}
            <Link to="/#worlds" className={navLinkClass({ isActive: false })}>
              Seven worlds
            </Link>
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
              <span className="relative">
              <NavLink
                to="/passport"
                aria-label={waiting > 0 ? `Your passport (${waiting} friend ${waiting === 1 ? 'request' : 'requests'})` : 'Your passport'}
                className="relative grid size-11 place-items-center overflow-hidden rounded-full bg-ink font-semibold text-[14px] text-on-ink transition hover:-translate-y-0.5"
              >
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : initials(user.name)}
              </NavLink>
              {/* A small dot when friend requests are waiting */}
              {waiting > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-danger" />}
              </span>
            )}
            {status === 'guest' && (
              <>
                {/* Wrapper does the hiding: buttonClasses always sets inline-flex, which would fight a `hidden` class. */}
                <span className="hidden sm:block">
                  <NavLink to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                    Log in
                  </NavLink>
                </span>
                <NavLink to="/signup" className={buttonClasses({ size: 'sm', className: 'h-11 px-5' })}>
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
