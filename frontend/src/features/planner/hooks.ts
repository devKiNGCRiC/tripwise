/**
 * hooks.ts (planner) — server calls for planning:
 *   useGenerateItinerary → asks the AI planner for a trip, streamed day by day (`preview`);
 *                          on success the trips list and the quota are refreshed
 *   useQuota             → how many AI plans are left today
 */
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itinerariesApi, meApi } from '@/lib/api/endpoints';
import type { Day, GenerateEvent, TripRequest } from '@/lib/api/types';

/** The trip so far, while the AI is still writing it. */
export interface TripPreview {
  title?: string;
  summary?: string;
  days: Day[];
}

/** Nothing written yet. */
const EMPTY_PREVIEW: TripPreview = { days: [] };

/**
 * Generate a trip, streaming it: `preview` fills in (title, then each day) while the AI
 * writes, and resets if a model fails part-way and another starts over.
 */
export function useGenerateItinerary() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<TripPreview>(EMPTY_PREVIEW);

  /** Fold one stream event into the preview. */
  const onEvent = useCallback((event: GenerateEvent) => {
    if (event.type === 'meta') setPreview((p) => ({ ...p, title: event.title, summary: event.summary }));
    if (event.type === 'day') setPreview((p) => ({ ...p, days: [...p.days, event.day] }));
    if (event.type === 'reset') setPreview(EMPTY_PREVIEW);
  }, []);

  const mutation = useMutation({
    mutationFn: (request: TripRequest) => {
      setPreview(EMPTY_PREVIEW);
      return itinerariesApi.generateStream(request, onEvent);
    },
    onSuccess: ({ itinerary, quota }) => {
      queryClient.setQueryData(['trip', itinerary.id], { itinerary });
      queryClient.setQueryData(['quota'], { quota });
      // Re-read both from the server (the quota in the answer is best-effort).
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['quota'] });
    },
  });
  return { ...mutation, preview };
}

/** Today's AI plan allowance. */
export function useQuota() {
  return useQuery({ queryKey: ['quota'], queryFn: () => meApi.quota(), select: (data) => data.quota });
}
