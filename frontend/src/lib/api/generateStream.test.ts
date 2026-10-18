/**
 * generateStream.test.ts — the planner's streaming call: events reach the page as they
 * arrive, `done` resolves with the trip, and an `error` event becomes an ApiError.
 */
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { apiUrl } from './config';
import { itinerariesApi } from './endpoints';
import { ApiError } from './errors';
import type { GenerateEvent, TripRequest } from './types';

const request: TripRequest = {
  destination: 'Goa',
  startDate: '2026-11-10',
  endDate: '2026-11-11',
  budget: { amount: 3000, currency: 'INR' },
  travellers: 'couple',
  interests: ['food'],
  pace: 'balanced',
};

/** Make the mock API answer the stream with these events. */
function answerWith(events: object[]) {
  server.use(
    http.post(apiUrl('/itineraries/generate/stream'), () =>
      new HttpResponse(events.map((e) => JSON.stringify(e)).join('\n') + '\n', { headers: { 'Content-Type': 'application/x-ndjson' } }),
    ),
  );
}

describe('itinerariesApi.generateStream', () => {
  it('passes events along and rejects with the error event as an ApiError', async () => {
    answerWith([
      { type: 'meta', title: 'T', summary: 'S' },
      { type: 'error', error: { code: 'AI_UNAVAILABLE', message: 'Our AI planners are busy right now.' } },
    ]);
    const seen: GenerateEvent[] = [];
    const error = await itinerariesApi.generateStream(request, (e) => seen.push(e)).catch((e: unknown) => e);
    expect(seen.map((e) => e.type)).toEqual(['meta', 'error']);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'AI_UNAVAILABLE', message: 'Our AI planners are busy right now.' });
  });

  it('rejects if the stream ends without a result', async () => {
    answerWith([{ type: 'meta', title: 'T', summary: 'S' }]);
    await expect(itinerariesApi.generateStream(request, () => {})).rejects.toMatchObject({ code: 'SERVER' });
  });
});
