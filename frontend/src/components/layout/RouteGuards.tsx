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
import { useAuth } from '@/features/auth/AuthProvider';
import { safeNext } from '@/features/auth/safeNext';
import { FullPageLoader } from './FullPageLoader';

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
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <ShieldAlert className="size-12 text-danger" aria-hidden />
        <h1 className="text-4xl font-extrabold">Admins only</h1>
        <p className="text-ink-soft">This area is for the TripWise crew. Your trips are safe in your passport.</p>
        <Link to="/passport" className={buttonClasses()}>
          Go to my passport
        </Link>
      </div>
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
