/**
 * askWeather.test.ts — the trip forecast from MET Norway (a fake network here; no real calls):
 *   - each India-time day's high, low, rain and a plain summary, from the hourly series
 *   - dates more than 9 days away aren't fetched at all
 *   - a failing or broken service gives no forecast (never an error)
 *   - one request per place per hour; it names TripWise (with the repo link), never a person
 */
import { describe, expect, it, vi } from 'vitest';
import { createWeather } from '../src/services/ask/weather.js';

const NOW = new Date('2026-11-02T10:00:00Z');

/** One hourly entry of MET Norway's compact format. */
const hour = (time: string, temp: number, rain: number, symbol: string) => ({
  time,
  data: { instant: { details: { air_temperature: temp } }, next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: rain } } },
});

/** 3 Nov (IST): hours from 2 Nov 18:30Z to 3 Nov 18:29Z. */
const SERIES = {
  properties: {
    timeseries: [
      hour('2026-11-02T18:00:00Z', 30, 0, 'clearsky_night'), // still 2 Nov in India (23:30 IST)
      hour('2026-11-02T19:00:00Z', 19.4, 0, 'clearsky_night'),
      hour('2026-11-03T03:00:00Z', 26, 0.2, 'fair_day'),
      hour('2026-11-03T08:00:00Z', 31.2, 1.5, 'rainshowers_day'),
      hour('2026-11-03T09:00:00Z', 30.6, 0.3, 'fair_day'),
      hour('2026-11-03T12:00:00Z', 24, 0, 'fair_night'),
    ],
  },
};

/** A fake fetch that answers with `body` (or fails). */
function fakeFetch(body: unknown, ok = true) {
  return vi.fn(async () => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response);
}

describe('weather', () => {
  it('summarises each India-time day', async () => {
    const fetchFn = fakeFetch(SERIES);
    const weather = createWeather(fetchFn as never, () => NOW);
    expect(await weather.forecast(15.3351, 76.4599, ['2026-11-03'])).toEqual([{ date: '2026-11-03', high: 31, low: 19, rainMm: 2, summary: 'mostly sunny' }]);
  });

  it('names TripWise, never a person, and asks once per place per hour', async () => {
    const fetchFn = fakeFetch(SERIES);
    const weather = createWeather(fetchFn as never, () => NOW);
    await weather.forecast(15.3351, 76.4599, ['2026-11-03']);
    await weather.forecast(15.3402, 76.4598, ['2026-11-03']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=15.34&lon=76.46');
    expect((init.headers as Record<string, string>)['User-Agent']).toBe('TripWise/1.0 (+https://github.com/devKiNGCRiC/tripwise)');
    expect(JSON.stringify(init)).not.toMatch(/@/);
  });

  it('doesn’t ask about dates more than 9 days away', async () => {
    const fetchFn = fakeFetch(SERIES);
    const weather = createWeather(fetchFn as never, () => NOW);
    expect(await weather.forecast(15.3, 76.4, ['2026-11-20', '2026-11-21'])).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('gives no forecast when the service fails or answers nonsense', async () => {
    expect(await createWeather(fakeFetch({}, false) as never, () => NOW).forecast(15.3, 76.4, ['2026-11-03'])).toBeNull();
    expect(await createWeather(fakeFetch({ nope: true }) as never, () => NOW).forecast(15.3, 76.4, ['2026-11-03'])).toBeNull();
    const throwing = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await createWeather(throwing as never, () => NOW).forecast(15.3, 76.4, ['2026-11-03'])).toBeNull();
  });
});
