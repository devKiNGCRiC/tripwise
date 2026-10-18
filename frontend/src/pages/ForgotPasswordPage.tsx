/**
 * ForgotPasswordPage.tsx — route /forgot-password: ask for a reset link by email.
 * The answer is always the same ("if that email has an account…"), so nobody can use this
 * page to find out who has a TripWise account.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { accountApi } from '@/lib/api/endpoints';

/** Route "/forgot-password". */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Ask for the link (any answer, even an error, shows the same message). */
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await accountApi.forgot(email.trim());
    } catch {
      // Same message either way.
    }
    setBusy(false);
    setSent(true);
  }

  return (
    <>
      <title>Forgot password · TripWise</title>
      <AuthLayout
        eyebrow="Lost the key?"
        eyebrowLocal="चाबी खो गई?"
        title="Forgot your password"
        subtitle="We'll email you a link to choose a new one."
        footer={
          <Link to="/login" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
            Back to log in
          </Link>
        }
      >
        {sent ? (
          <p role="status" className="rounded-2xl border border-line bg-glass px-4 py-4 text-center font-medium">
            If that email has an account, we've sent a reset link
          </p>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-4" noValidate>
            <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" size="lg" fullWidth loading={busy}>
              Send reset link
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
