/**
 * SecurityPanel.tsx — "Security": change your password, sign out on every device, or just
 * log out here.
 */
import { useState, type FormEvent } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { accountApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { AccountSection, FormError } from './AccountSection';

/** The Security section. */
export function SecurityPanel() {
  const { logout, forgetSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | 'everywhere' | 'logout' | null>(null);

  /** Change the password (this device stays signed in). */
  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (next.length < 8) return setError('Passwords need at least 8 characters');
    setBusy('password');
    try {
      await accountApi.changePassword(current, next);
      setCurrent('');
      setNext('');
      toast.show({ title: 'Password changed — other devices were signed out', tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your password couldn’t be changed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  /** End every login, here too. */
  async function signOutEverywhere() {
    setBusy('everywhere');
    try {
      await accountApi.logoutAll();
    } catch {
      // Even if the server didn't answer, this device signs out.
    }
    await navigate('/login', { replace: true });
    forgetSession();
    toast.show({ title: 'Signed out on all devices', tone: 'info' });
  }

  /** Log out on this device only. */
  async function logOutHere() {
    setBusy('logout');
    await logout();
    toast.show({ title: 'Logged out. Safe travels!', tone: 'info' });
    navigate('/login', { replace: true });
  }

  return (
    <AccountSection title="Security">
      <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
        <Input label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint="At least 8 characters" />
        <div className="grid gap-3 sm:col-span-2">
          <FormError message={error} />
          <Button type="submit" loading={busy === 'password'} className="justify-self-start">
            Change password
          </Button>
        </div>
      </form>
      <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-6">
        <Button variant="secondary" icon={<ShieldCheck aria-hidden className="size-4" />} loading={busy === 'everywhere'} onClick={signOutEverywhere}>
          Sign out on all devices
        </Button>
        <Button variant="ghost" icon={<LogOut aria-hidden className="size-4" />} loading={busy === 'logout'} onClick={logOutHere}>
          Log out
        </Button>
      </div>
    </AccountSection>
  );
}
