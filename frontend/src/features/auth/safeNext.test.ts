/**
 * safeNext.test.ts — Review Focus #1: the ?next= redirect must never leave TripWise.
 */
import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('allows same-site paths with query strings', () => {
    expect(safeNext('/plan?destination=Goa')).toBe('/plan?destination=Goa');
  });

  it.each([null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)'])(
    'falls back for unsafe value %s',
    (value) => {
      expect(safeNext(value)).toBe('/passport');
    },
  );
});
