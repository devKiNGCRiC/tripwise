/**
 * hooks.ts (planner) — server calls for planning:
 *   useGenerateItinerary → asks the AI planner for a trip; on success the trips list and
 *                          the quota are refreshed (the new trip page loads its own data)
 *   useQuota             → how many AI plans are left today
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itinerariesApi, meApi } from '@/lib/api/endpoints';
import type { TripRequest } from '@/lib/api/types';

/** Generate a trip. */
export function useGenerateItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: TripRequest) => itinerariesApi.generate(request),
    onSuccess: ({ itinerary, quota }) => {
      queryClient.setQueryData(['trip', itinerary.id], { itinerary });
      queryClient.setQueryData(['quota'], { quota });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/** Today's AI plan allowance. */
export function useQuota() {
  return useQuery({ queryKey: ['quota'], queryFn: () => meApi.quota(), select: (data) => data.quota });
}
