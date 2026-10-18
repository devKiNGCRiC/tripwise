/**
 * hooks.ts (friends) — server data and actions for friends:
 *   useFriends()       my friends and requests (incoming / sent)
 *   useFriendAction()  any change (request, accept, decline, cancel, remove, block, invite)
 *                      that then refreshes the friends list and passports
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { friendsApi } from '@/lib/api/endpoints';

/** My friends and requests (only while logged in). */
export function useFriends() {
  const { status } = useAuth();
  return useQuery({ queryKey: ['friends'], queryFn: () => friendsApi.list(), enabled: status === 'authenticated' });
}

/** Run a friends action, then refresh what it changes. */
export function useFriendAction<A, R>(action: (arg: A) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['friends'] });
      void queryClient.invalidateQueries({ queryKey: ['passport'] });
    },
  });
}
