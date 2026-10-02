/**
 * queryClient.ts — TanStack Query settings for the whole app.
 *
 * TanStack Query caches server data, de-duplicates requests and tracks
 * loading/error states for us. Here we decide when to retry: only for
 * problems a retry can fix (network blips, server hiccups, cold starts).
 */
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/errors';

/** Retry NETWORK/SERVER failures at most twice; never retry 4xx-style user errors. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return error instanceof ApiError && (error.code === 'NETWORK' || error.code === 'SERVER');
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Data stays "fresh" for a minute — no refetch storm when navigating back and forth.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
      // Mutations (generate, save, delete) are never retried automatically — avoids duplicates.
      mutations: { retry: false },
    },
  });
}
