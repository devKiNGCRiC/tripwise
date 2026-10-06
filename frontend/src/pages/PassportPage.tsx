/**
 * PassportPage.tsx — route /passport (profile).
 * Plan 1 version: identity, theme and logout. Plan 2 adds trip stamps and the daily quota meter.
 */
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { ThemeToggle } from '@/theme/ThemeToggle';

export default function PassportPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // ProtectedRoute guarantees a user; this guard only satisfies TypeScript.
  if (!user) return null;

  /** Log out, say goodbye, and land on the login page. */
  async function handleLogout() {
    await logout();
    toast.show({ title: 'Logged out. Safe travels!', tone: 'info' });
    navigate('/login', { replace: true });
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <title>Your passport · TripWise</title>
      <h1 className="text-4xl font-extrabold sm:text-5xl">Your passport</h1>

      <Card className="mt-8 overflow-hidden">
        <div className="flex items-center justify-between bg-green-deep px-6 py-3 text-white">
          <span className=" text-xs font-bold tracking-[0.25em]">TRIPWISE · PASSPORT</span>
          <span className=" text-xs font-bold uppercase">{user.role}</span>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-line bg-yellow font-display text-3xl font-extrabold text-on-accent shadow-pop-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <dl className="grid flex-1 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-widest text-ink-soft">NAME</dt>
              <dd className="font-bold">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-ink-soft">EMAIL</dt>
              <dd className="font-bold break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-ink-soft">MEMBER SINCE</dt>
              <dd className="font-bold">{memberSince}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm font-semibold text-ink-soft">Day / Night Flight theme</span>
        </div>
        <Button variant="secondary" icon={<LogOut className="size-4" aria-hidden />} onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
