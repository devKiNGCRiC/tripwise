/**
 * hooks.ts (toli) — server data and actions for Tolis:
 *   useTolis()        my Tolis (with unread chat counts), refreshed every 30 s
 *   useToli(id)       one Toli, refreshed every 10 s while it's open
 *   useToliAction()   any change to a Toli, then a refresh of that Toli and the list
 * Screens refresh by polling (no live connection), which keeps TripWise free to run.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { toliApi } from '@/lib/api/endpoints';

/** How often an open Toli screen refreshes. */
export const TOLI_REFRESH_MS = 10_000;
/** How often the Tolis list (and its unread badges) refreshes. */
export const LIST_REFRESH_MS = 30_000;

/** My Tolis (only while logged in). */
export function useTolis() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['tolis'], queryFn: () => toliApi.list(), select: (d) => d.tolis, enabled: status === 'authenticated', refetchInterval: LIST_REFRESH_MS });
}

/** One Toli. */
export function useToli(id: string) {
  return useQuery({ queryKey: ['toli', id], queryFn: () => toliApi.get(id), select: (d) => d.toli, refetchInterval: TOLI_REFRESH_MS, retry: false });
}

/** Change something in a Toli, then refresh it (and the list). */
export function useToliAction<A, R>(toliId: string, action: (arg: A) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['toli', toliId] });
      void queryClient.invalidateQueries({ queryKey: ['tolis'] });
    },
  });
}
