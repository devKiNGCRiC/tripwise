/**
 * KushalSync.tsx — automatic family check-ins, only if the traveller switched them on, and only
 * while TripWise is open and on screen: once on opening (if the last one is over 30 minutes old)
 * and then every 30 minutes. Never in the background, never by text message. Renders nothing.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { checkInFromHere, useKushal } from './hooks';

/** How often to check in automatically (ms). */
const EVERY_MS = 30 * 60_000;

/** Send automatic check-ins while the app is open. */
export function KushalSync() {
  const kushal = useKushal();
  const queryClient = useQueryClient();
  const auto = kushal.data?.auto ?? false;
  const lastAt = kushal.data?.latest?.at;
  const sending = useRef(false);

  useEffect(() => {
    if (!auto) return;
    /** Check in if it's been a while and the page is on screen. */
    const tick = () => {
      const since = lastAt ? Date.now() - Date.parse(lastAt) : Infinity;
      if (sending.current || document.visibilityState === 'hidden' || since < EVERY_MS) return;
      sending.current = true;
      void checkInFromHere()
        .then(() => queryClient.invalidateQueries({ queryKey: ['kushal'] }))
        .catch(() => undefined)
        .finally(() => (sending.current = false));
    };
    tick();
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [auto, lastAt, queryClient]);

  return null;
}
