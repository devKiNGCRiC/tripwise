/**
 * DeleteAccount.tsx — "Danger zone": delete the account and everything in it. The
 * password is typed first and a final dialog asks once more, because this can't be undone.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { accountApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { AccountSection, FormError } from './AccountSection';

/** The Danger zone section. */
export function DeleteAccount() {
  const { forgetSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** First click: ask to confirm. */
  function ask(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!password) return setError('Type your password to confirm');
    setAsking(true);
  }

  /** Confirmed: delete everything, then leave. */
  async function remove() {
    setBusy(true);
    try {
      await accountApi.deleteAccount(password);
      // Leave the protected page first, then forget the session (else it would bounce to log in).
      await navigate('/', { replace: true });
      forgetSession();
      toast.show({ title: 'Your account and data have been deleted', tone: 'info' });
    } catch (err) {
      setAsking(false);
      setError(err instanceof ApiError ? err.message : 'Your account couldn’t be deleted. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountSection title="Danger zone" tone="danger" lede="Deleting your account removes your trips, journals, photos and friendships for good.">
      <form onSubmit={ask} className="grid gap-4 sm:max-w-md">
        <Input label="Your password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <FormError message={error} />
        <Button type="submit" variant="secondary" className="justify-self-start text-danger">
          Delete my account
        </Button>
      </form>
      {asking && (
        <ConfirmDialog title="Delete your account?" confirmLabel="Delete forever" onConfirm={remove} onCancel={() => setAsking(false)} busy={busy}>
          This can't be undone. Your passport, trips, journals, photos and friends will all be gone.
        </ConfirmDialog>
      )}
    </AccountSection>
  );
}
