/**
 * SignupPage.tsx — route /signup.
 */
import { Link, useSearchParams } from 'react-router';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { SignupForm } from '@/features/auth/SignupForm';

/** Route "/signup". */
export default function SignupPage() {
  // Keep ?next= when switching to login so the user still ends up where they were going.
  const [params] = useSearchParams();
  const next = params.get('next');
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <>
      <title>Sign up · TripWise</title>
      <AuthLayout
        eyebrow="Departures"
        eyebrowLocal="प्रस्थान"
        title="Start your passport"
        subtitle="Free forever. Plan up to 5 AI trips every day."
        footer={
          <>
            Already have an account?{' '}
            <Link to={loginHref} className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
              Log in
            </Link>
          </>
        }
      >
        <GoogleButton />
        <SignupForm />
      </AuthLayout>
    </>
  );
}
