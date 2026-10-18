/**
 * validate.test.ts — AI answers are only accepted when they make sense for the request.
 */
import { describe, expect, it } from 'vitest';
import { InvalidAiOutput, parseDay, parseTrip } from '../../src/services/ai/validate.js';
import { aiDayFixture, aiTripFixture, tripRequest } from '../helpers/fakeAi.js';

const req = tripRequest();
/** Parse a modified copy of the valid fixture. */
const parseWith = (change: (trip: ReturnType<typeof aiTripFixture>) => void) => {
  const trip = structuredClone(aiTripFixture(req));
  change(trip);
  return () => parseTrip(JSON.stringify(trip), req);
};

describe('parseTrip', () => {
  it('accepts a valid answer', () => {
    expect(parseTrip(JSON.stringify(aiTripFixture(req)), req).days).toHaveLength(3);
  });

  it('rejects the wrong number of days', () => {
    expect(parseWith((t) => t.days.pop())).toThrow(InvalidAiOutput);
  });

  it('rejects too many activities for the pace (6 on a chill trip)', () => {
    const chill = tripRequest({ pace: 'chill' });
    const trip = aiTripFixture(chill);
    trip.days[0] = aiDayFixture('packed', 'x');
    trip.days[0].activities.push(...aiDayFixture('chill', 'y').activities);
    expect(() => parseTrip(JSON.stringify(trip), chill)).toThrow(InvalidAiOutput);
  });

  it('rejects times that go backwards', () => {
    expect(
      parseWith((t) => {
        t.days[1].activities[1].startTime = '08:00';
      }),
    ).toThrow(/time/i);
  });

  it('rejects a transfer after the last stop of a day', () => {
    expect(
      parseWith((t) => {
        t.days[0].activities.at(-1)!.transfer = { mode: 'walk', minutes: 5 };
      }),
    ).toThrow(InvalidAiOutput);
  });

  it('rejects negative costs and badly written times', () => {
    expect(parseWith((t) => (t.breakdown.food = -1))).toThrow(InvalidAiOutput);
    expect(parseWith((t) => (t.days[0].activities[0].startTime = '9am'))).toThrow(InvalidAiOutput);
  });

  it('treats an answer cut off halfway as invalid (long trips hitting the output limit)', () => {
    const text = JSON.stringify(aiTripFixture(tripRequest({ endDate: '2026-11-23', pace: 'packed' })));
    expect(() => parseTrip(text.slice(0, text.length / 2), req)).toThrow(InvalidAiOutput);
  });

  it('accepts JSON wrapped in a ```json fence (some models add one)', () => {
    expect(parseTrip('```json\n' + JSON.stringify(aiTripFixture(req)) + '\n```', req).title).toContain('Goa');
  });
});

describe('parseDay', () => {
  it('accepts a valid day and rejects an empty one', () => {
    expect(parseDay(JSON.stringify(aiDayFixture('balanced', 'd')), 'balanced').activities).toHaveLength(3);
    expect(() => parseDay(JSON.stringify({ theme: 'x', activities: [] }), 'balanced')).toThrow(InvalidAiOutput);
  });
});
