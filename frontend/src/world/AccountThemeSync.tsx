/**
 * AccountThemeSync.tsx — your photo colours follow you to every device.
 * When you're signed in and your account has a saved theme (from trip photos or "Your
 * colours"), the living world is tinted with it. Renders nothing.
 */
import { useEffect } from 'react';
import { useProfile } from '@/features/account/hooks';
import { useWorld } from './WorldProvider';

/** Apply the signed-in traveller's saved colours. */
export function AccountThemeSync() {
  const profile = useProfile();
  const { setTint } = useWorld();
  const theme = profile.data?.theme;

  // A saved theme wins; no saved theme leaves whatever this device chose.
  useEffect(() => {
    if (theme) setTint(theme);
  }, [theme, setTint]);

  return null;
}
