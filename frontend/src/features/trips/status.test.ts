/**
 * status.test.ts — when a trip is, in words: a countdown before it starts, "happening now"
 * during it, and "past" afterwards.
 */
import { describe, expect, it } from 'vitest';
import { tripStatus } from './status';

describe('tripStatus', () => {
  const today = '2026-10-18';

  it('counts down to upcoming trips', () => {
    expect(tripStatus('2026-10-19', '2026-10-21', today)).toEqual({ phase: 'upcoming', label: 'Starts tomorrow', days: 1 });
    expect(tripStatus('2026-11-18', '2026-11-20', today)).toEqual({ phase: 'upcoming', label: 'In 31 days', days: 31 });
  });

  it('knows a trip that is happening now', () => {
    expect(tripStatus('2026-10-17', '2026-10-20', today)).toMatchObject({ phase: 'ongoing', label: 'Happening now' });
    expect(tripStatus('2026-10-18', '2026-10-18', today).phase).toBe('ongoing');
  });

  it('marks finished trips as past', () => {
    expect(tripStatus('2026-09-01', '2026-09-05', today)).toMatchObject({ phase: 'past', label: 'Past trip' });
  });
});
