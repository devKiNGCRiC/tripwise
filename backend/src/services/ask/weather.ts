/**
 * weather.ts (ask) — the weather forecast for a trip's days, from MET Norway (the Norwegian
 * Meteorological Institute): free, no key, commercial use allowed with credit ("Weather: MET
 * Norway"). It covers about 9 days ahead.
 *   - Each India-time day becomes { high, low, rain in mm, a plain summary } from the hourly series.
 *   - One request per place (rounded to about 1 km) per hour; days further out aren't fetched.
 *   - It never throws: if the service is down, slow or odd, there is simply no forecast and
 *     Ask TripWise answers from typical weather instead.
 *   - Requests name TripWise with the project link, as MET Norway asks — never a person's email.
 */
import type { DayForecast } from './prompt.js';

/** MET Norway's forecast address. */
const API = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
/** Who is asking (MET Norway's terms ask for an identifying User-Agent). */
const USER_AGENT = 'TripWise/1.0 (+https://github.com/devKiNGCRiC/tripwise)';
/** How far ahead the forecast goes (days). */
const HORIZON_DAYS = 9;
/** How long one answer is reused (ms). */
const CACHE_MS = 60 * 60 * 1000;
/** Give up on a slow answer (ms). */
const TIMEOUT_MS = 5000;
/** India is 5 h 30 min ahead of UTC. */
const IST_OFFSET_MS = 330 * 60 * 1000;

/** Plain words for MET Norway's weather symbols (without _day/_night). */
const WORDS: Record<string, string> = {
  clearsky: 'clear skies',
  fair: 'mostly sunny',
  partlycloudy: 'partly cloudy',
  cloudy: 'cloudy',
  fog: 'foggy',
  lightrain: 'light rain',
  rain: 'rain',
  heavyrain: 'heavy rain',
  lightrainshowers: 'light showers',
  rainshowers: 'showers',
  heavyrainshowers: 'heavy showers',
  rainandthunder: 'rain and thunder',
  rainshowersandthunder: 'thunder showers',
  heavyrainandthunder: 'heavy rain and thunder',
  sleet: 'sleet',
  snow: 'snow',
  lightsnow: 'light snow',
  heavysnow: 'heavy snow',
};

/** One hourly (or six-hourly) entry, as much as we read of it. */
interface Entry {
  time: string;
  data?: {
    instant?: { details?: { air_temperature?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
  };
}

/** The India-time date ("YYYY-MM-DD") of a UTC time. */
const istDate = (iso: string) => new Date(Date.parse(iso) + IST_OFFSET_MS).toISOString().slice(0, 10);

/** Daily forecasts for the asked dates from a series (dates without data are left out). */
function summarise(series: Entry[], dates: string[]): DayForecast[] {
  return dates.flatMap((date) => {
    const day = series.filter((e) => istDate(e.time) === date);
    const temps = day.map((e) => e.data?.instant?.details?.air_temperature).filter((t): t is number => typeof t === 'number');
    if (!temps.length) return [];
    // Rain: the next hour where given, else the next six hours (later in the series).
    const rain = day.reduce((sum, e) => sum + (e.data?.next_1_hours?.details?.precipitation_amount ?? e.data?.next_6_hours?.details?.precipitation_amount ?? 0), 0);
    // The most common kind of weather that day.
    const counts = new Map<string, number>();
    for (const e of day) {
      const code = (e.data?.next_1_hours ?? e.data?.next_6_hours)?.summary?.symbol_code?.replace(/_(day|night|polartwilight)$/, '');
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return [{ date, high: Math.round(Math.max(...temps)), low: Math.round(Math.min(...temps)), rainMm: Math.round(rain * 10) / 10, summary: (common && WORDS[common]) ?? common ?? 'mixed weather' }];
  });
}

/** A forecast source with its own small cache. */
export function createWeather(fetchFn: typeof fetch = fetch, now: () => Date = () => new Date()) {
  const cache = new Map<string, { at: number; series: Entry[] }>();

  /** The series for a rounded position (cached for an hour); null when unavailable. */
  async function seriesFor(lat: number, lon: number): Promise<Entry[] | null> {
    const key = `${lat},${lon}`;
    const hit = cache.get(key);
    if (hit && now().getTime() - hit.at < CACHE_MS) return hit.series;
    try {
      const res = await fetchFn(`${API}?lat=${lat}&lon=${lon}`, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return null;
      const body = (await res.json()) as { properties?: { timeseries?: Entry[] } };
      const series = body?.properties?.timeseries;
      if (!Array.isArray(series)) return null;
      cache.set(key, { at: now().getTime(), series });
      return series;
    } catch {
      return null;
    }
  }

  return {
    /** Forecasts for the given trip dates, or null (too far away, or the service is unavailable). */
    async forecast(lat: number, lon: number, dates: string[]): Promise<DayForecast[] | null> {
      const today = istDate(now().toISOString());
      const last = istDate(new Date(now().getTime() + HORIZON_DAYS * 86_400_000).toISOString());
      const wanted = dates.filter((d) => d >= today && d <= last);
      if (!wanted.length) return null;
      const series = await seriesFor(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100);
      if (!series) return null;
      const days = summarise(series, wanted);
      return days.length ? days : null;
    },
  };
}

/** A forecast source (what routes depend on; tests pass a fake). */
export type Weather = ReturnType<typeof createWeather>;
