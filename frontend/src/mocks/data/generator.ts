/**
 * generator.ts — the mock "AI planner". Builds a believable day-by-day itinerary from a
 * trip request and (when known) the destination's data, with no network and no AI.
 *
 * Deterministic: the same request and `variant` always give the same plan (so tests and
 * demos are stable); a different variant reshuffles — used to regenerate a single day.
 * The real backend (Gemini / Groq) returns the same Itinerary shape.
 */
import type { Activity, Day, Destination, Interest, Itinerary, Pace, TransferMode, TripRequest } from '@/lib/api/types';

/** Activities per day for each pace. */
const PER_DAY: Record<Pace, number> = { chill: 2, balanced: 3, packed: 4 };
/** First start time (minutes after midnight) for each pace. */
const FIRST_START: Record<Pace, number> = { chill: 10 * 60, balanced: 9 * 60 + 30, packed: 8 * 60 };
/** Rough group cost multiplier over one person's daily cost. */
const TRAVELLER_FACTOR: Record<TripRequest['travellers'], number> = { solo: 1, couple: 1.8, friends: 3.2, family: 3.5 };
/** Day themes, picked per day. */
const THEMES = ['Arrive and settle in', 'Old town and local flavours', 'Into the landscape', 'Markets, craft and stories', 'Slow morning, golden evening', 'Hidden corners', 'One last look'];

/** When an idea works: "am" = before 11:00, "pm" = from 16:00 (sunset, nightlife), "any" = whenever. */
type When = 'am' | 'pm' | 'any';
/** One activity idea: [title, description, when it works]. */
type Idea = [string, string, When];

/** Activity ideas for each interest. */
const IDEAS: Record<Interest, Idea[]> = {
  food: [['Street-food walk', 'Taste the local favourites with a guide who knows every stall.', 'any'], ['Thali at a family kitchen', 'A home-style meal, the way locals eat it.', 'any']],
  culture: [['Heritage walk', 'Lanes, courtyards and the stories behind them.', 'any'], ['Evening performance', 'Music or dance in a traditional setting.', 'pm']],
  adventure: [['Morning trek', 'A guided trail with big views at the top.', 'am'], ['River or ridge adventure', 'Rafting, zip-line or a ridge walk, by season.', 'any']],
  nightlife: [['Sunset drinks', 'A rooftop or beach spot as the sky turns gold.', 'pm'], ['Live music night', 'Where the locals actually go after dark.', 'pm']],
  nature: [['Viewpoint at first light', 'Get there early, before the crowds and the haze.', 'am'], ['Lakeside or forest walk', 'An easy loop with birdsong and shade.', 'any']],
  shopping: [['Craft market', 'Handmade textiles, metalwork and spices.', 'any'], ['Artisan workshop visit', 'Meet the makers; buy straight from them.', 'any']],
  history: [['Fort or palace tour', 'With a guide, so the walls start talking.', 'any'], ['Museum hour', 'The small museum most visitors skip.', 'any']],
  relaxation: [['Slow café morning', 'A long breakfast with a view.', 'am'], ['Spa or ayurveda session', 'An hour to do absolutely nothing.', 'any']],
  photography: [['Golden-hour photo walk', 'The best light, the best angles.', 'pm'], ['Blue-hour viewpoint', 'City lights against a deep sky.', 'pm']],
  spiritual: [['Temple at dawn', 'Bells, incense and the first prayers of the day.', 'am'], ['Evening aarti', 'Lamps, chants and a moment of stillness.', 'pm']],
};
/** Fallbacks when nothing else fits a slot (still never repeated within a day). */
const FILLERS: Idea[] = [
  ['Free time to wander', 'No plan — follow whatever catches your eye.', 'any'],
  ['Long lunch somewhere local', 'Ask your host for their favourite.', 'any'],
  ['Neighbourhood stroll', 'Side streets, small shops and chai stops.', 'any'],
  ['Dinner with a view', 'End the day somewhere beautiful.', 'pm'],
];

/** Does an idea suit a start time (minutes after midnight)? */
function fits(when: When, minutes: number) {
  if (when === 'am') return minutes < 11 * 60;
  if (when === 'pm') return minutes >= 16 * 60;
  return true;
}

/** Transfer modes and minute ranges, varied by step. */
const TRANSFERS: [TransferMode, number][] = [['walk', 8], ['auto', 12], ['cab', 20], ['walk', 15], ['boat', 25], ['bus', 30]];

/** Small seeded random generator (same seed → same sequence). */
function seeded(text: string) {
  let s = 2166136261;
  for (const ch of text) s = Math.imul(s ^ ch.charCodeAt(0), 16777619);
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** Every date from start to end inclusive, as "YYYY-MM-DD" (at most 14). */
export function tripDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const day = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (day <= last && dates.length < 14) {
    dates.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

/** Minutes after midnight → "HH:MM". */
const clock = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Part of the day for a start time. */
const partOfDay = (minutes: number): Activity['time'] => (minutes < 12 * 60 ? 'morning' : minutes < 17 * 60 ? 'afternoon' : 'evening');

/** Build one day of activities. */
export function buildDay(req: TripRequest, destination: Destination | undefined, date: string, dayNumber: number, variant: number): Day {
  const random = seeded(`${req.destination}|${date}|${dayNumber}|${variant}|${req.interests.join(',')}`);
  const place = destination?.name ?? req.destination;
  const count = PER_DAY[req.pace];
  // Ideas: the destination's own highlights, the traveller's interests, then gentle fillers.
  const highlights: Idea[] = (destination?.highlights ?? []).map((h) => [h, `One of ${place}'s best-loved sights.`, 'any']);
  const pool = [...highlights, ...req.interests.flatMap((i) => IDEAS[i])];
  const used = new Set<string>();
  /** A not-yet-used idea that suits this time of day (random among those that fit). */
  const pick = (minutes: number): Idea => {
    const fitting = pool.filter(([title, , when]) => !used.has(title) && fits(when, minutes));
    const choice = fitting[Math.floor(random() * fitting.length)] ?? FILLERS.find(([title, , when]) => !used.has(title) && fits(when, minutes)) ?? FILLERS[0];
    used.add(choice[0]);
    return choice;
  };
  const daily = destination ? destination.avgDailyCost.amount : req.budget.amount;
  let minutes = FIRST_START[req.pace];
  const activities: Activity[] = [];
  for (let k = 0; k < count; k++) {
    const [title, description] = pick(minutes);
    const [mode, base] = TRANSFERS[Math.floor(random() * TRANSFERS.length)];
    const isLast = k === count - 1;
    activities.push({
      time: partOfDay(minutes),
      startTime: clock(minutes),
      title,
      description,
      location: place,
      estCost: Math.round((daily * (0.08 + random() * 0.12)) / 50) * 50,
      transfer: isLast ? undefined : { mode, minutes: base + Math.floor(random() * 10) },
    });
    // Next stop: this activity's length (1.5–3 h) plus the transfer.
    minutes += 90 + Math.floor(random() * 90) + (isLast ? 0 : (activities[k].transfer?.minutes ?? 0));
    minutes = Math.ceil(minutes / 15) * 15;
  }
  return { dayNumber, date, theme: THEMES[Math.floor(random() * THEMES.length)], activities };
}

/** Packing list: basics plus what the region and season call for. */
function packingFor(destination: Destination | undefined, months: number[]): string[] {
  const list = ['Comfortable walking shoes', 'Reusable water bottle', 'Power bank', 'ID and copies of bookings'];
  const region = destination?.region;
  if (region === 'himalaya' || region === 'sisters') list.push('Warm layers', 'Rain jacket', 'Altitude medicine (ask your doctor)');
  if (region === 'thar' || region === 'deccan') list.push('Sun hat and sunscreen', 'Light cotton clothes', 'Scarf for dust');
  if (region === 'konkan' || region === 'ghats') list.push('Swimwear', 'Insect repellent', 'Quick-dry clothes');
  if (region === 'ganga') list.push('Modest clothing for temples', 'Slip-on sandals');
  if (months.some((m) => m >= 6 && m <= 9)) list.push('Umbrella — it may rain');
  return list;
}

/** Tips for the trip. */
function tipsFor(req: TripRequest, place: string): string[] {
  const tips = [`Start early in ${place} — mornings are cooler and quieter.`, 'Carry some cash; smaller places may not take cards.', 'Book popular sights a day ahead in peak season.'];
  if (req.travellers === 'family') tips.push('Plan a rest break after lunch — little ones (and grandparents) will thank you.');
  if (req.travellers === 'friends') tips.push('Split shared costs as you go so nobody does maths at the end.');
  if (req.travellers === 'solo') tips.push('Share your day plan with someone back home.');
  return tips;
}

/** Generate a whole itinerary (without id/createdAt, which the store assigns). */
export function generateItinerary(req: TripRequest, destination?: Destination, variant = 0): Omit<Itinerary, 'id' | 'createdAt'> {
  const place = destination?.name ?? req.destination;
  const dates = tripDates(req.startDate, req.endDate);
  const days = dates.map((date, i) => buildDay(req, destination, date, i + 1, variant));
  const perDay = destination ? destination.avgDailyCost.amount : req.budget.amount;
  const total = Math.round((perDay * dates.length * TRAVELLER_FACTOR[req.travellers]) / 100) * 100;
  const months = dates.map((d) => Number(d.slice(5, 7)));
  return {
    request: req,
    title: `${dates.length} ${dates.length === 1 ? 'day' : 'days'} in ${place}`,
    summary: `A ${req.pace} trip through ${place}, shaped around ${req.interests.join(', ')}.`,
    days,
    estimatedCost: {
      total,
      breakdown: { stay: Math.round(total * 0.4), food: Math.round(total * 0.25), transport: Math.round(total * 0.15), activities: Math.round(total * 0.2) },
      currency: 'INR',
    },
    tips: tipsFor(req, place),
    packingList: packingFor(destination, months),
    provider: variant % 2 ? 'groq' : 'gemini',
  };
}
