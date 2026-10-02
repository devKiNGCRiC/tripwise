/**
 * hooks.ts (explore) — data hooks for destinations.
 * The query key includes the filters, so each filter combo is cached separately
 * and flipping back to a previous filter is instant.
 */
import { useQuery } from '@tanstack/react-query';
import { destinationsApi } from '@/lib/api/endpoints';
import type { DestinationFilters } from '@/lib/api/types';

export function useDestinations(filters: DestinationFilters = {}) {
  return useQuery({
    queryKey: ['destinations', filters],
    queryFn: () => destinationsApi.list(filters),
    select: (data) => data.destinations,
  });
}
