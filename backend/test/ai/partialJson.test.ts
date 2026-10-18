/**
 * partialJson.test.ts — reading a trip while the AI is still writing it: the title and
 * summary as soon as they are complete, then each day the moment its last brace arrives.
 */
import { describe, expect, it } from 'vitest';
import { createTripStreamParser } from '../../src/services/ai/partialJson.js';
import type { AiDay } from '../../src/services/ai/schema.js';
import { aiTripFixture, tripRequest } from '../helpers/fakeAi.js';

/** Feed text in pieces of `size` characters; collect what the parser reports. */
function feed(text: string, size: number) {
  const parser = createTripStreamParser();
  const metas: { title: string; summary: string }[] = [];
  const days: AiDay[] = [];
  for (let i = 0; i < text.length; i += size) {
    const out = parser.push(text.slice(i, i + size));
    if (out.meta) metas.push(out.meta);
    days.push(...out.days);
  }
  return { metas, days };
}

describe('trip stream parser', () => {
  const trip = aiTripFixture(tripRequest());
  const text = JSON.stringify(trip, null, 2);

  it('reports the title and summary once, and every day once, in order', () => {
    const { metas, days } = feed(text, 7);
    expect(metas).toEqual([{ title: trip.title, summary: trip.summary }]);
    expect(days).toEqual(trip.days);
  });

  it('copes with braces, brackets and escaped quotes inside strings', () => {
    const tricky = structuredClone(trip);
    tricky.title = 'Goa {and} [more] "quoted" \\ trip';
    tricky.days[0].activities[0].description = 'Try the "best" } bebinca ] here {';
    const { metas, days } = feed(JSON.stringify(tricky), 3);
    expect(metas[0].title).toBe(tricky.title);
    expect(days).toEqual(tricky.days);
  });

  it('works one character at a time and when everything arrives at once', () => {
    expect(feed(text, 1).days).toHaveLength(3);
    expect(feed(text, text.length).days).toHaveLength(3);
  });

  it('reports a day only when it is complete, and skips days that are not valid', () => {
    const parser = createTripStreamParser();
    const half = '{"title":"T","summary":"S","days":[{"theme":"A","activities":[{"time":"morning"';
    expect(parser.push(half).days).toEqual([]);
    const out = parser.push(',"startTime":"09:00","title":"x","description":"y","estCost":0}]},{"theme":"bad"},');
    expect(out.days).toHaveLength(1);
    expect(out.days[0].theme).toBe('A');
  });
});
