/**
 * hooks.ts (passport) — server data for passports and trip journals:
 *   usePassport()            my passport (cover, worlds, marks, stamps)
 *   usePublicPassport(name)  someone else's, as their privacy allows
 *   useJournal(tripId)       one trip's journal, with save / add photo / remove photo
 * Saving a journal refreshes the passport so its stamp shows the new rating at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { journalApi, passportApi } from '@/lib/api/endpoints';
import type { Journal } from '@/lib/api/types';

/** My passport. */
export function usePassport() {
  return useQuery({ queryKey: ['passport'], queryFn: () => passportApi.mine(), select: (d) => d.passport });
}

/**
 * Someone's public passport (and how I'm connected to them). It waits until we know who is
 * looking (the login is restored after a page load), and asks again if that changes —
 * otherwise a friend could be shown "private" just because their login wasn't back yet.
 */
export function usePublicPassport(username: string) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: ['passport', 'of', username.toLowerCase(), user?.id ?? 'visitor'],
    queryFn: () => passportApi.of(username),
    retry: false,
    enabled: status !== 'loading',
  });
}

/** One trip's journal and the actions on it. */
export function useJournal(tripId: string | null) {
  const queryClient = useQueryClient();
  const key = ['journal', tripId];
  const query = useQuery({ queryKey: key, queryFn: () => journalApi.get(tripId!), select: (d) => d.journal, enabled: !!tripId });

  /** After any change: keep the new journal and refresh the passport's stamps. */
  const settle = ({ journal }: { journal: Journal }) => {
    queryClient.setQueryData(key, { journal });
    void queryClient.invalidateQueries({ queryKey: ['passport'] });
  };
  const save = useMutation({ mutationFn: (entry: { rating: number | null; memory: string }) => journalApi.save(tripId!, entry), onSuccess: settle });
  const addPhoto = useMutation({
    mutationFn: (photo: { blob: Blob; width: number; height: number; alt: string }) => journalApi.addPhoto(tripId!, photo.blob, photo),
    onSuccess: settle,
  });
  const removePhoto = useMutation({ mutationFn: (photoId: string) => journalApi.removePhoto(tripId!, photoId), onSuccess: settle });
  return { query, save, addPhoto, removePhoto };
}
