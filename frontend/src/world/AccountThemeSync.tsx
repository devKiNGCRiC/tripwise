/**
 * AccountThemeSync.tsx — your photo colours follow you to every device. Renders nothing.
 *   Signed in, account has colours  → the living world wears them (and this device remembers them).
 *   Signed in, account has none     → colours chosen on this device (say, as a guest) are saved
 *                                      to the account, so they follow you from now on.
 *   Logging out                     → this device goes back to the region's own colours, so the
 *                                      next person on it doesn't wear yours.
 */
import { useEffect, useRef } from 'react';
import { useProfile, useUpdateProfile } from '@/features/account/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { useWorld } from './WorldProvider';

/** Keep the signed-in traveller's colours in step between the account and this device. */
export function AccountThemeSync() {
  const { status, user } = useAuth();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const { tint, setTint } = useWorld();
  const theme = profile.data?.theme;
  const loaded = profile.isSuccess;
  // Whose colours have been settled already (once per sign-in).
  const settledFor = useRef<string | null>(null);
  const wasSignedIn = useRef(false);

  // A saved theme wins; no saved theme adopts this device's colours (once).
  useEffect(() => {
    if (theme) {
      setTint(theme);
      settledFor.current = user?.id ?? null;
      return;
    }
    if (!loaded || !user || settledFor.current === user.id) return;
    settledFor.current = user.id;
    if (tint) updateProfile.mutate({ theme: tint });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the account's colours arrive, not on every tint change
  }, [theme, loaded, user?.id, setTint]);

  // Signed out (not just "still checking"): back to the region's colours on this device.
  useEffect(() => {
    if (status === 'authenticated') wasSignedIn.current = true;
    else if (status === 'guest' && wasSignedIn.current) {
      wasSignedIn.current = false;
      settledFor.current = null;
      setTint(null);
    }
  }, [status, setTint]);

  return null;
}
