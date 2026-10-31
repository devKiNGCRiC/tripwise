/**
 * localPlanner.ts — TripWise's own planner: a complete trip from the places catalogue,
 * with no AI at all. Used when every AI model is down, and as the free, unlimited "Quick
 * plan". Pure functions with no imports at run time, so the website's mock API runs exactly
 * this code too.
 *
 * How a plan is made:
 *   1. Rank the destination's places: a strong lean towards the traveller's interests, then
 *      fame (how many Wikipedias cover it).
 *   2. Take as many as the trip needs (days × the pace's stops), or all there are.
 *   3. Group them into days: each day starts at the most famous place left and adds the
 *      nearest remaining ones, so a day stays in one area. Short on places → shorter days.
 *   4. Time each day from 09:00: time at each kind of place, a lunch break mid-day, and a
 *      transfer between stops picked by distance (walk / auto / cab).
 *   5. Costs: the destination's average daily cost × days × people, split
 *      stay 40 % · food 25 % · transport 15 % · activities 20 %.
 * Nothing is invented: every stop is a catalogue place; opening hours and fees aren't known,
 * and a tip says so.
 */
import type { Interest, Pace, TripRequest } from '../types/api.js';

/** A catalogue place, as the planner needs it. */
export interface LocalPlace {
  id: string;
  name: string;
  kind: string;
  interests: string[];
  lat: number;
  lon: number;
  fame: number;
  description?: string;
}

/** The destination, as the planner needs it. */
export interface LocalDestination {
  name: string;
  region?: string | null;
  /** INR per person per day */
  avgDailyCost: number;
}

/** A planned stop (same shape as an AI stop, plus its catalogue place). */
export interface LocalStop {
  time: 'morning' | 'afternoon' | 'evening';
  startTime: string;
  title: string;
  description: string;
  transfer?: { mode: 'walk' | 'auto' | 'cab'; minutes: number };
  place?: { id: string; lat: number; lon: number };
}

/** A whole planned trip (same shape as an AI trip). */
export interface LocalTrip {
  title: string;
  region: 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters' | 'abroad' | 'none';
  summary: string;
  days: { theme: string; activities: LocalStop[] }[];
  breakdown: { stay: number; food: number; transport: number; activities: number };
  tips: string[];
  packingList: string[];
}

/** Stops per day for each pace (the same as the AI planner, services/ai/prompt.ts). */
const PER_DAY: Record<Pace, number> = { chill: 2, balanced: 3, packed: 4 };
/** Roughly how many people each group is (for costs). */
const PEOPLE: Record<TripRequest['travellers'], number> = { solo: 1, couple: 2, friends: 4, family: 4 };
/** Minutes to spend at each kind of place. */
const VISIT_MINUTES: Record<string, number> = {
  fort: 120, palace: 120, museum: 120, heritage: 120, wildlife: 180, nature: 120, water: 90, beach: 120,
  temple: 60, shrine: 60, ghat: 60, monument: 45, market: 90, garden: 60,
};
/** What to call each kind of place when there's no description. */
const KIND_WORDS: Record<string, string> = {
  temple: 'Temple', shrine: 'Place of worship', ghat: 'Riverside ghat', fort: 'Fort', palace: 'Palace', museum: 'Museum',
  wildlife: 'Wildlife reserve', heritage: 'Heritage site', beach: 'Beach', water: 'Lake or waterfall', garden: 'Garden',
  nature: 'Natural landmark', market: 'Market', monument: 'Monument',
};
/** Something worth packing in each world. */
const PACK_FOR: Record<string, string> = {
  himalaya: 'Warm layers — mornings and evenings are cold up high',
  thar: 'A sun hat and a light scarf for the desert sun and dust',
  ganga: 'Modest clothes that cover shoulders and knees for temples',
  deccan: 'A sun hat — the plateau gets hot by midday',
  ghats: 'A light rain jacket — showers come and go in the hills',
  konkan: 'Sunscreen and sandals for the coast',
  sisters: 'A rain jacket and a warm layer for the hills',
};
/** Score weight of each interest a place shares with the traveller. */
const INTEREST_WEIGHT = 3;
/** Day starts at 09:00 (minutes after midnight); lunch takes an hour. */
const DAY_START = 9 * 60;
const LUNCH_MINUTES = 60;

/** Places best first for these interests: interests weigh heavily, then fame, then name. */
export function rankForInterests<P extends LocalPlace>(places: P[], interests: readonly (Interest | string)[]): P[] {
  const score = (p: P) => Math.log2(1 + p.fame) + INTEREST_WEIGHT * p.interests.filter((i) => interests.includes(i)).length;
  return [...places].sort((a, b) => score(b) - score(a) || b.fame - a.fame || a.name.localeCompare(b.name));
}

/** Kilometres between two places (haversine). */
function distanceKm(a: LocalPlace, b: LocalPlace): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** How to get from one place to the next: walk under 1.2 km, auto under 15 km, else a cab. */
function transferBetween(a: LocalPlace, b: LocalPlace): NonNullable<LocalStop['transfer']> {
  const km = distanceKm(a, b);
  const [mode, kmPerHour] = km < 1.2 ? (['walk', 5] as const) : km < 15 ? (['auto', 18] as const) : (['cab', 35] as const);
  // Rounded up to 5 minutes, and never less than 5.
  return { mode, minutes: Math.max(5, Math.ceil(((km / kmPerHour) * 60) / 5) * 5) };
}

/** Every date from start to end, inclusive (at most 14). */
function datesOf(start: string, end: string): string[] {
  const out: string[] = [];
  const day = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (day <= last && out.length < 14) {
    out.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return out;
}

/** Minutes after midnight → "HH:MM". */
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
/** The part of the day a time falls in. */
const partOf = (minutes: number): LocalStop['time'] => (minutes < 12 * 60 ? 'morning' : minutes < 17 * 60 ? 'afternoon' : 'evening');
/** "hindu temple in Hampi" → "Hindu temple in Hampi." */
const sentence = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}${/[.!?]$/.test(text) ? '' : '.'}`;

/** Split the chosen places into days that each stay in one area. */
function groupIntoDays(chosen: LocalPlace[], days: number): LocalPlace[][] {
  const left = [...chosen];
  const groups: LocalPlace[][] = [];
  for (let d = 0; d < days; d++) {
    // Spread what's left evenly over the remaining days.
    const size = Math.ceil(left.length / (days - d));
    // Start at the best place left (chosen is already in best-first order).
    const day = [left.shift()!];
    while (day.length < size && left.length) {
      const last = day[day.length - 1];
      let nearest = 0;
      left.forEach((p, i) => {
        if (distanceKm(last, p) < distanceKm(last, left[nearest])) nearest = i;
      });
      day.push(left.splice(nearest, 1)[0]);
    }
    groups.push(day);
  }
  return groups;
}

/** One day's timetable: stops from 09:00, a lunch break mid-way, transfers between. */
function timetable(group: LocalPlace[]): LocalStop[] {
  const lunchAfter = Math.ceil(group.length / 2);
  const stops: LocalStop[] = [];
  let now = DAY_START;
  group.forEach((place, i) => {
    stops.push({
      time: partOf(now),
      startTime: clock(now),
      title: place.name,
      description: sentence(place.description ?? KIND_WORDS[place.kind] ?? 'A well-known place'),
      place: { id: place.id, lat: place.lat, lon: place.lon },
    });
    now += VISIT_MINUTES[place.kind] ?? 75;
    const next = group[i + 1];
    if (i + 1 === lunchAfter) {
      // Lunch nearby, then on to the next stop.
      stops[stops.length - 1].transfer = { mode: 'walk', minutes: 5 };
      now += 5;
      stops.push({ time: partOf(now), startTime: clock(now), title: 'Lunch break', description: `Find a local thali or a busy dhaba near ${place.name}.` });
      now += LUNCH_MINUTES;
    }
    if (next) {
      const hop = transferBetween(place, next);
      stops[stops.length - 1].transfer = hop;
      now += hop.minutes;
    }
  });
  return stops;
}

/**
 * A whole trip from catalogue places, or null when there are fewer places than days (no
 * place is ever repeated, and a day with nothing in it isn't a plan).
 */
export function planLocalTrip(req: TripRequest, destination: LocalDestination, places: LocalPlace[]): LocalTrip | null {
  const dates = datesOf(req.startDate, req.endDate);
  if (places.length < dates.length) return null;
  const chosen = rankForInterests(places, req.interests).slice(0, dates.length * PER_DAY[req.pace]);
  const days = groupIntoDays(chosen, dates.length).map((group) => ({ theme: `Around ${group[0].name}`, activities: timetable(group) }));

  const total = destination.avgDailyCost * dates.length * PEOPLE[req.travellers];
  const region = (destination.region ?? 'none') as LocalTrip['region'];
  return {
    title: `${dates.length} ${dates.length === 1 ? 'day' : 'days'} in ${destination.name}`,
    region,
    summary: `A ${req.pace} plan built by TripWise from ${chosen.length} well-known places in ${destination.name}, grouped so each day stays in one area.`,
    days,
    breakdown: { stay: Math.round(total * 0.4), food: Math.round(total * 0.25), transport: Math.round(total * 0.15), activities: Math.round(total * 0.2) },
    tips: [
      'Opening hours and entry fees change — check them before you go.',
      'Each day stays in one area to save travel time; swap days around freely.',
      'For food spots and hidden gems, ask the AI planner when your daily plans reset.',
    ],
    packingList: ['Comfortable walking shoes', 'A refillable water bottle', 'ID card (needed at some monuments)', 'Cash for autos and entry tickets', ...(PACK_FOR[region] ? [PACK_FOR[region]] : [])],
  };
}
