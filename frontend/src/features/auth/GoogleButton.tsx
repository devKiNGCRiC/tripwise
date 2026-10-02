/**
 * GoogleButton.tsx — "Continue with Google".
 *
 * In mock mode it signs in a fake Google user so the flow can be demoed.
 * Real Google Identity Services (free) is wired up in the backend plan, which
 * needs a Google OAuth client id; until then the button hides outside mock mode.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { USE_MOCKS } from '@/lib/api/config';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from './AuthProvider';
import { useFinishAuth } from './useFinishAuth';

/** Google's "G" mark, drawn inline (no image request). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12S6.6 21.7 12 21.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function GoogleButton() {
  const { loginWithGoogle } = useAuth();
  const finishAuth = useFinishAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidden until real Google sign-in exists (backend plan).
  if (!USE_MOCKS) return null;

  /** Sign in with the mock credential, then continue like any other login. */
  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      finishAuth(await loginWithGoogle('mock-google-credential'), 'login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size="lg" fullWidth loading={pending} icon={<GoogleMark />} onClick={handleClick}>
        Continue with Google
      </Button>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
