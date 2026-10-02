/**
 * queryClient.test.ts — we only retry failures that a retry can actually fix.
 */
import { describe, expect, it } from 'vitest';
import { ApiError } from './api/errors';
import { shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('retries network and server errors up to twice', () => {
    expect(shouldRetry(0, new ApiError('NETWORK', 'x', 0))).toBe(true);
    expect(shouldRetry(1, new ApiError('SERVER', 'x', 500))).toBe(true);
    expect(shouldRetry(2, new ApiError('SERVER', 'x', 500))).toBe(false);
  });

  it('never retries user errors like 404 or quota exceeded', () => {
    expect(shouldRetry(0, new ApiError('NOT_FOUND', 'x', 404))).toBe(false);
    expect(shouldRetry(0, new ApiError('QUOTA_EXCEEDED', 'x', 429))).toBe(false);
  });
});
