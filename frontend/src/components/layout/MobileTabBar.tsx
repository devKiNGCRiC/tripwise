/**
 * MobileTabBar.tsx — app-style bottom navigation on phones (hidden from md up):
 * a floating glass pill with five thumb-reachable tabs. The active tab gets a
 * solid ink bubble. The account tab becomes "Log in" for guests.
 */
import { Compass, House, LogIn, Sparkles, Ticket, UserRound, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { useFriends } from '@/features/friends/hooks';
import { cn } from '@/lib/utils/cn';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Bottom navigation for phones. */
export function MobileTabBar() {
  const { user } = useAuth();
  // Friend requests waiting (a dot on the Passport tab).
  const waiting = useFriends().data?.incoming.length ?? 0;

  const tabs: Tab[] = [
    { to: '/', label: 'Home', icon: House },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/plan', label: 'Plan', icon: Sparkles },
    { to: '/trips', label: 'Trips', icon: Ticket },
    user ? { to: '/passport', label: 'Passport', icon: UserRound } : { to: '/login', label: 'Log in', icon: LogIn },
  ];

  return (
    <nav aria-label="Mobile" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 md:hidden">
      <ul className="glass grid grid-cols-5 rounded-full p-1.5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-colors duration-300',
                  isActive ? 'bg-ink text-on-ink' : 'text-soft',
                )
              }
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {to === '/passport' && waiting > 0 && <span aria-hidden className="absolute -top-1 -right-1.5 size-2.5 rounded-full bg-danger" />}
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
