/**
 * PassportPage.tsx — route /passport (profile), styled like a real passport:
 * a navy cover with a gold gateway-arch emblem and your details (always navy, in both
 * themes, like the real document), then a stamp page that fills up as you save
 * trips (each stamp opens its trip), then today's AI plan allowance and settings:
 * motion, theme, log out.
 */
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { MotionChoice } from '@/features/passport/MotionChoice';
import { QuotaMeter } from '@/features/passport/QuotaMeter';
import { StampGrid } from '@/features/passport/StampGrid';
import { ThemeToggle } from '@/theme/ThemeToggle';

/** Route "/passport": the traveller's passport. */
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
    <div className="mx-auto max-w-5xl px-4 pt-28 pb-20">
      <title>Your passport · TripWise</title>
      <header className="glass inline-block rounded-[28px] px-7 py-5">
        <p lang="hi" className="text-2xl text-accent-2">
          पासपोर्ट
        </p>
        <h1 className="mt-1 text-[clamp(44px,6vw,76px)]">Your passport</h1>
      </header>

      <div className="mt-10 grid overflow-hidden rounded-card border border-line shadow-[0_40px_80px_-40px_rgb(0_0_0/.45)] md:grid-cols-[0.9fr_1.1fr]">
        {/* Cover: navy with gold foil, like the real document */}
        <section aria-label="Passport cover" className="relative isolate overflow-hidden bg-[#0f1a40] p-8 text-[#f6efe3]">
          {/* Gold-foil emblem: nested gateway arches, like the crest on a real passport */}
          <svg aria-hidden viewBox="0 0 100 120" className="absolute -right-10 -bottom-12 -z-10 w-64 text-[#e6b765] opacity-50" fill="none" stroke="currentColor" strokeWidth="1">
            {[0, 8, 16, 24].map((i) => (
              <path key={i} d={`M${i} 120 V${45 + i * 0.6} C${i} ${25 + i} ${22 + i * 0.3} ${12 + i * 0.4} 50 ${4 + i} C${78 - i * 0.3} ${12 + i * 0.4} ${100 - i} ${25 + i} ${100 - i} ${45 + i * 0.6} V120`} />
            ))}
          </svg>
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
        <section className="flex min-h-80 flex-col items-center justify-center gap-4 glass-strong bg-[radial-gradient(circle,var(--trip-line)_1.2px,transparent_1.4px)] bg-size-[20px_20px] p-8 text-center">
          <StampGrid />
        </section>
      </div>

      <GlassPanel className="mt-8 flex flex-col gap-8">
        <QuotaMeter />
        <div className="border-t border-line pt-6">
          <MotionChoice />
        </div>
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
