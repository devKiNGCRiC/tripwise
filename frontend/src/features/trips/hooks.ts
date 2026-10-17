/**
 * hooks.ts (trips) — server data for saved trips:
 *   useTrips          → the traveller's trips, newest first
 *   useTrip           → one trip (its own cache entry, also filled right after generating)
 *   useRegenerateDay  → a fresh take on one day; updates the cached trip in place
 *   useDeleteTrip     → removes a trip and refreshes the list
 *   useShareTrip      → creates the public read-only link id
 *   useSharedTrip     → a shared trip by its public id (no login)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itinerariesApi, shareApi } from '@/lib/api/endpoints';

/** All of the traveller's trips. */
export function useTrips() {
  return useQuery({ queryKey: ['trips'], queryFn: () => itinerariesApi.list(), select: (data) => data.itineraries });
}

/** One trip by id. */
export function useTrip(id: string) {
  return useQuery({ queryKey: ['trip', id], queryFn: () => itinerariesApi.get(id), select: (data) => data.itinerary });
}

/** Regenerate day `n` of trip `id`. */
export function useRegenerateDay(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (day: number) => itinerariesApi.regenerateDay(id, day),
    onSuccess: (data) => {
      queryClient.setQueryData(['trip', id], data);
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/** Delete trip `id`. */
export function useDeleteTrip(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => itinerariesApi.remove(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['trip', id] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/** Create (or fetch) the public share id for trip `id`. */
export function useShareTrip(id: string) {
  return useMutation({ mutationFn: () => itinerariesApi.share(id) });
}

/** A shared trip, read-only, by its public id. */
export function useSharedTrip(shareId: string) {
  return useQuery({ queryKey: ['shared', shareId], queryFn: () => shareApi.get(shareId), select: (data) => data.itinerary });
}
