/**
 * LoginPage.tsx — route /login. Thin page: layout + form + Google + links.
 * In mock mode, a dashed note shows the demo account.
 * React 19 hoists the <title> element into <head> automatically.
 */
import { Link, useSearchParams } from 'react-router';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { LoginForm } from '@/features/auth/LoginForm';
import { USE_MOCKS } from '@/lib/api/config';

/** Route "/login". */
export default function LoginPage() {
  // Keep ?next= when switching to signup so the user still ends up where they were going.
  const [params] = useSearchParams();
  const next = params.get('next');
  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : '/signup';

  return (
    <>
      <title>Log in · TripWise</title>
      <AuthLayout
        eyebrow="Arrivals"
        eyebrowLocal="आगमन"
        title="Welcome back"
        subtitle="Your trips are waiting where you left them."
        footer={
          <>
            New to TripWise?{' '}
            <Link to={signupHref} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
              Create a free account
            </Link>
          </>
        }
      >
        <GoogleButton />
        <LoginForm />
        {USE_MOCKS && (
          <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-center text-sm text-soft">
            Demo: demo@tripwise.app / password123
          </p>
        )}
      </AuthLayout>
    </>
  );
}
