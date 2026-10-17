/**
 * RouteGuards.tsx — layout routes that decide who may see their child pages.
 *   ProtectedRoute → logged-in users only (guests go to /login?next=…)
 *   AdminRoute     → admins only (others see an "Admins only" message)
 *   GuestRoute     → logged-OUT users only (login/signup bounce logged-in users onward)
 * While the session is still restoring, all three show a loader — never a wrong redirect.
 */
import { ShieldAlert } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useAuth } from '@/features/auth/AuthProvider';
import { safeNext } from '@/features/auth/safeNext';
import { FullPageLoader } from './FullPageLoader';
import { LiquidScene } from './LiquidScene';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'guest') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'guest') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (user?.role !== 'admin') {
    return (
      <LiquidScene>
        <GlassPanel className="flex flex-col items-center gap-4 text-center">
          <ShieldAlert className="size-10 text-gold" aria-hidden />
          <h1 className="text-[clamp(44px,7vw,64px)]">Admins only</h1>
          <p className="text-lg text-ink-soft">This area is for the TripWise crew. Your trips are safe in your passport.</p>
          <Link to="/passport" className={buttonClasses({ className: 'mt-2' })}>
            Go to my passport
          </Link>
        </GlassPanel>
      </LiquidScene>
    );
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={safeNext(params.get('next'))} replace />;
  return <Outlet />;
}
