/**
 * PassportPage.tsx — route /passport (profile), styled like a real passport:
 * a navy cover with a gold rangoli emblem and your details (always navy, in both
 * themes, like the real document), then a stamp page that fills up as you save
 * trips (stamps arrive with Plan 2), then settings: motion, theme, log out.
 */
import { LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Rangoli } from '@/components/signature/Rangoli';
import { Button, buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { MotionChoice } from '@/features/passport/MotionChoice';
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
    <div className="mx-auto max-w-5xl px-4 pt-32 pb-20">
      <title>Your passport · TripWise</title>
      <p lang="hi" className="text-2xl text-gold">
        पासपोर्ट
      </p>
      <h1 className="mt-2 text-[clamp(48px,6vw,80px)]">Your passport</h1>

      <div className="mt-10 grid overflow-hidden rounded-card border border-line shadow-[0_40px_80px_-40px_rgb(0_0_0/.45)] md:grid-cols-[0.9fr_1.1fr]">
        {/* Cover: navy with gold foil, like the real document */}
        <section aria-label="Passport cover" className="relative isolate overflow-hidden bg-[#0f1a40] p-8 text-[#f6efe3]">
          <Rangoli className="absolute -right-24 -bottom-24 -z-10 w-80 text-[#e6b765] opacity-60" />
          <p className="font-display text-2xl text-[#e6b765]">TripWise passport</p>
          <p lang="hi" className="text-[#e6b765]/80">
            यात्री पासपोर्ट
          </p>
          <div aria-hidden className="mt-7 grid size-20 place-items-center rounded-full border border-[#e6b765] font-display text-4xl text-[#e6b765]">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <dl className="mt-7 grid gap-4">
            <div>
              <dt className="text-xs tracking-[0.2em] uppercase opacity-70">Name</dt>
              <dd className="text-xl font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.2em] uppercase opacity-70">Email</dt>
              <dd className="font-medium break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.2em] uppercase opacity-70">Traveller since</dt>
              <dd className="font-medium">{memberSince}</dd>
            </div>
          </dl>
        </section>

        {/* Stamp page: empty until the first saved trip */}
        <section className="flex min-h-80 flex-col items-center justify-center gap-4 bg-paper-2 bg-[radial-gradient(circle,var(--trip-line)_1.2px,transparent_1.4px)] bg-size-[20px_20px] p-8 text-center">
          <div aria-hidden className="grid size-24 place-items-center rounded-full border-2 border-dashed border-gold/60 font-display text-sm tracking-widest text-gold uppercase">
            Your
            <br />
            stamp
          </div>
          <h2 className="text-3xl">No stamps yet</h2>
          <p className="max-w-[32ch] text-ink-soft">Every trip you save lands here as a stamp. Where's the first one going to be?</p>
          <Link to="/plan" className={buttonClasses()}>
            Plan your first trip
          </Link>
        </section>
      </div>

      <GlassPanel className="mt-8 flex flex-col gap-8">
        <MotionChoice />
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="font-medium">Day or Night theme</span>
          </div>
          <Button variant="secondary" icon={<LogOut className="size-4" aria-hidden />} onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}
