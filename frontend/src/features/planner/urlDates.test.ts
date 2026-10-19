/**
 * urlDates.test.ts — trip dates the planner takes from its address: exact dates from a
 * festival (`?start=&end=`), or a 4-day trip early in a chosen month (`?month=`), never
 * in the past and never longer than the planner allows; anything odd is ignored.
 */
import { describe, expect, it } from 'vitest';
import { datesFromUrl } from './urlDates';

const params = (q: string) => new URLSearchParams(q);
const today = new Date('2026-10-20T10:00:00');

describe('datesFromUrl', () => {
  it('uses exact dates when they are valid and still ahead', () => {
    expect(datesFromUrl(params('start=2026-12-01&end=2026-12-04'), today)).toEqual({ startDate: '2026-12-01', endDate: '2026-12-04' });
  });

  it('turns a month into a 4-day trip early that month (next year once this year’s has passed)', () => {
    expect(datesFromUrl(params('month=12'), today)).toEqual({ startDate: '2026-12-01', endDate: '2026-12-04' });
    expect(datesFromUrl(params('month=3'), today)).toEqual({ startDate: '2027-03-01', endDate: '2027-03-04' });
  });

  it('starts a few days from now for the current month', () => {
    expect(datesFromUrl(params('month=10'), today)).toEqual({ startDate: '2026-10-23', endDate: '2026-10-26' });
  });

  it('ignores past, broken or too-long dates and odd months', () => {
    expect(datesFromUrl(params('start=2026-01-01&end=2026-01-03'), today)).toEqual({});
    expect(datesFromUrl(params('start=soon&end=later'), today)).toEqual({});
    expect(datesFromUrl(params('start=2026-12-01&end=2027-01-30'), today)).toEqual({});
    expect(datesFromUrl(params('month=13'), today)).toEqual({});
    expect(datesFromUrl(params(''), today)).toEqual({});
  });
});
