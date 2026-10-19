/**
 * passportCode.test.ts — the passport-style code line keeps every part (never cut mid-way).
 */
import { describe, expect, it } from 'vitest';
import { passportCode } from './passportCode';

describe('passportCode', () => {
  it('ends with the month joined, even for long names', () => {
    const line = passportCode('Demo Traveller', 'demotraveller', '2026-09-01T10:00:00.000Z');
    expect(line).toBe('P<IND<TRAVELLER<<DEMO<<DEMOTRAVELLER<<SINCE<SEP26');
  });

  it('handles one-word names and pads short lines with <', () => {
    const line = passportCode('Asha', 'asha', '2026-10-19T10:00:00.000Z');
    expect(line.startsWith('P<IND<ASHA<<<<ASHA<<SINCE<OCT26')).toBe(true);
    expect(line.length).toBeGreaterThanOrEqual(44);
  });
});
