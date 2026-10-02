/**
 * ServerWakingBanner.test.tsx — Review Focus #3: explain cold starts, then get out of the way.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { slowRequests } from '@/lib/api/slowRequests';
import { ServerWakingBanner } from './ServerWakingBanner';

describe('ServerWakingBanner', () => {
  afterEach(() => {
    act(() => slowRequests.add(-100));
  });

  it('appears while a request is slow and disappears afterwards', () => {
    render(<ServerWakingBanner />);
    expect(screen.queryByText(/waking up/i)).not.toBeInTheDocument();

    act(() => slowRequests.add(1));
    expect(screen.getByText(/waking up/i)).toBeInTheDocument();

    act(() => slowRequests.add(-1));
    expect(screen.queryByText(/waking up/i)).not.toBeInTheDocument();
  });
});
