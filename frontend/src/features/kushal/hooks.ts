/**
 * hooks.ts (kushal) — my Kushal (family check-in) data, and checking in from the phone:
 *   useKushal       my contacts, the automatic switch and my latest check-in
 *   checkInFromHere asks the phone where it is (once) and checks in; without a position (refused
 *                   or unavailable) it still checks in, just without the place
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { kushalApi } from '@/lib/api/endpoints';

/** My Kushal data (only when signed in). */
export function useKushal() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['kushal'], queryFn: () => kushalApi.mine(), enabled: status === 'authenticated' });
}

/** The phone's position once, or null if it won't say. */
function phonePosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  });
}

/** Check in from wherever the phone is (with an optional note). */
export async function checkInFromHere(note?: string) {
  const position = await phonePosition();
  return kushalApi.checkIn({ ...(position ?? {}), ...(note?.trim() ? { note: note.trim() } : {}) });
}
