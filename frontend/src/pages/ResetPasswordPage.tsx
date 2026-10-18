/**
 * ResetPasswordPage.tsx — route /reset-password/:token, opened from the reset email:
 * choose a new password. The link works once, for 30 minutes; afterwards every device is
 * signed out and the traveller logs in with the new password.
 */
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormError } from '@/features/account/AccountSection';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { accountApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';

/** Route "/reset-password/:token". */
export default function ResetPasswordPage() {
  const { token = '' } = useParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Save the new password. */
  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Passwords need at least 8 characters');
    setBusy(true);
    try {
      await accountApi.reset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your password couldn’t be changed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <title>New password · TripWise</title>
      <AuthLayout
        eyebrow="A fresh start"
        eyebrowLocal="नई शुरुआत"
        title="Choose a new password"
        subtitle="At least 8 characters."
        footer={
          <Link to="/forgot-password" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
            Need a new link?
          </Link>
        }
      >
        {done ? (
          <div role="status" className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-glass px-4 py-5 text-center">
            <p className="font-medium">Password updated — log in with your new password</p>
            <Link to="/login" className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4">
              Log in
            </Link>
          </div>
        ) : (
          <form onSubmit={save} className="flex flex-col gap-4" noValidate>
            <FormError message={error} />
            <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" size="lg" fullWidth loading={busy}>
              Set new password
            </Button>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
