/**
 * PassportPage.tsx — route /passport (profile), styled like a real passport:
 * a deep-blue cover with your details, then an empty stamp page that fills up
 * as you save trips (stamps arrive with Plan 2).
 */
import { LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useAuth } from '@/features/auth/AuthProvider';
import { SceneryChoice } from '@/features/passport/SceneryChoice';
import { StillScenery } from '@/scene/photo/StillScenery';
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
    <div>
      <StillScenery stage="River" />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <title>Your passport · TripWise</title>
        <h1 className="text-[clamp(40px,5vw,64px)] text-white font-stretch-125% [text-shadow:0_4px_24px_rgb(0_0_0/.45)]">Your passport</h1>

        <div className="mt-8 grid overflow-hidden rounded-card border-[3px] border-line shadow-pop md:grid-cols-[0.9fr_1.1fr]">
          {/* Cover: always deep blue with cream text, like the real document */}
          <section className="relative overflow-hidden bg-[linear-gradient(140deg,#0f3d68,#0e6f7a)] p-7 text-[#fff8ec]">
            <span aria-hidden className="absolute -top-10 -right-10 size-48 rounded-full border-2 border-white/20 shadow-[0_0_0_26px_rgb(255_255_255/.05),0_0_0_52px_rgb(255_255_255/.04)]" />
            <p className="font-display text-xl font-black font-stretch-130%">TripWise passport</p>
            <div aria-hidden className="mt-6 grid size-20 place-items-center rounded-2xl border-[3px] border-black bg-yellow font-display text-4xl font-black text-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <dl className="mt-6 grid gap-3">
              <div>
                <dt className="text-sm opacity-75">Name</dt>
                <dd className="text-xl font-semibold">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Email</dt>
                <dd className="font-semibold break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm opacity-75">Traveller since</dt>
                <dd className="font-semibold">{memberSince}</dd>
              </div>
            </dl>
          </section>

          {/* Stamp page: empty until the first saved trip */}
          <section className="flex min-h-72 flex-col items-center justify-center gap-4 bg-paper-2 p-8 text-center [background-image:var(--trip-dots)] bg-size-[18px_18px]">
            <div aria-hidden className="grid size-24 place-items-center rounded-full border-4 border-dashed border-ink-soft/50 text-3xl">
              ✈
            </div>
            <h2 className="text-2xl font-stretch-115%">No stamps yet</h2>
            <p className="max-w-[32ch] text-ink-soft">Every trip you save lands here as a stamp. Where's the first one going to be?</p>
            <Link to="/plan" className={buttonClasses()}>
              Plan your first trip
            </Link>
          </section>
        </div>

        {/* Settings on glass so they read clearly over the river scenery */}
        <GlassPanel className="mt-8 flex flex-col gap-6">
          <SceneryChoice />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <span className="font-semibold">Day or Night Flight theme</span>
            </div>
            <Button variant="secondary" icon={<LogOut className="size-4" aria-hidden />} onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
