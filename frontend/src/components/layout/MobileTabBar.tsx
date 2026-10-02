/**
 * MobileTabBar.tsx — app-style bottom navigation on phones (hidden from md up).
 * Five thumb-reachable tabs; the account tab becomes "Log in" for guests.
 */
import { Compass, House, LogIn, Sparkles, Ticket, UserRound, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils/cn';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function MobileTabBar() {
  const { user } = useAuth();

  const tabs: Tab[] = [
    { to: '/', label: 'Home', icon: House },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/plan', label: 'Plan', icon: Sparkles },
    { to: '/trips', label: 'Trips', icon: Ticket },
    user ? { to: '/passport', label: 'Passport', icon: UserRound } : { to: '/login', label: 'Log in', icon: LogIn },
  ];

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-ink' : 'text-ink-soft')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-mustard text-on-accent')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
