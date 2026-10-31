/**
 * localPlanner.test.ts — TripWise's own planner (no AI), on made-up places in two areas
 * about 5 km apart:
 *   - the right number of days, each with the pace's stops plus a lunch break
 *   - no place twice, every stop linked to its place, times rising through the day
 *   - each day stays in one area; transfers walk short hops and take an auto/cab further
 *   - too few places: shorter days, never repeats; fewer places than days: no plan
 *   - costs split from the destination's daily cost, for the whole group
 *   - places lean towards the traveller's interests
 */
import { describe, expect, it } from 'vitest';
import { planLocalTrip, rankForInterests, type LocalPlace } from '../src/services/localPlanner.js';
import { tripRequest } from './helpers/fakeAi.js';

/** A place `i` in area A (around 15.330, 76.460) or B (about 5 km north-east). */
function place(i: number, area: 'A' | 'B', kind = 'temple', interests = ['spiritual', 'culture', 'history']): LocalPlace {
  const [lat, lon] = area === 'A' ? [15.33, 76.46] : [15.365, 76.495];
  return { id: `p_${area}${i}`, name: `${area} place ${i}`, kind, interests, lat: lat + i * 0.001, lon: lon + i * 0.001, fame: 100 - i, description: `temple in area ${area}` };
}
/** Six places in each area. */
const PLACES = [...[1, 2, 3, 4, 5, 6].map((i) => place(i, 'A')), ...[1, 2, 3, 4, 5, 6].map((i) => place(i, 'B'))];
/** The destination. */
const DEST = { name: 'Hampi', region: 'deccan', avgDailyCost: 2000 };
/** "HH:MM" → minutes. */
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

describe('planLocalTrip', () => {
  it('plans every day with the pace’s stops and a lunch break, no repeats, times rising', () => {
    const req = tripRequest({ destination: 'Hampi', startDate: '2026-11-10', endDate: '2026-11-12', pace: 'balanced' });
    const trip = planLocalTrip(req, DEST, PLACES)!;
    expect(trip.days).toHaveLength(3);
    const stops = trip.days.flatMap((d) => d.activities.filter((a) => a.place));
    expect(stops).toHaveLength(9);
    expect(new Set(stops.map((s) => s.place!.id)).size).toBe(9);
    for (const day of trip.days) {
      expect(day.activities.filter((a) => a.title === 'Lunch break')).toHaveLength(1);
      const times = day.activities.map((a) => minutes(a.startTime!));
      expect(times).toEqual([...times].sort((a, b) => a - b));
      day.activities.forEach((a, i) => (i < day.activities.length - 1 ? expect(a.transfer).toBeDefined() : expect(a.transfer).toBeUndefined()));
    }
  });

  it('keeps each day in one area and picks transport by distance', () => {
    const req = tripRequest({ startDate: '2026-11-10', endDate: '2026-11-11', pace: 'packed' });
    const trip = planLocalTrip(req, DEST, PLACES)!;
    for (const day of trip.days) {
      const areas = new Set(day.activities.flatMap((a) => (a.place ? [a.place.id.slice(2, 3)] : [])));
      expect(areas.size).toBe(1);
      // Places 0.0014° apart (~150 m) are a short walk.
      const firstHop = day.activities[0].transfer!;
      expect(firstHop.mode).toBe('walk');
      expect(firstHop.minutes).toBeGreaterThanOrEqual(5);
    }
  });

  it('makes shorter days when places run out, and gives up when there are fewer places than days', () => {
    const req = tripRequest({ startDate: '2026-11-10', endDate: '2026-11-12', pace: 'packed' });
    const few = planLocalTrip(req, DEST, PLACES.slice(0, 5))!;
    const ids = few.days.flatMap((d) => d.activities.flatMap((a) => (a.place ? [a.place.id] : [])));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    few.days.forEach((d) => expect(d.activities.some((a) => a.place)).toBe(true));
    expect(planLocalTrip(req, DEST, PLACES.slice(0, 2))).toBeNull();
  });

  it('splits the costs from the daily cost for the whole group', () => {
    const req = tripRequest({ startDate: '2026-11-10', endDate: '2026-11-12', travellers: 'couple' });
    const { breakdown } = planLocalTrip(req, DEST, PLACES)!;
    // 2,000 a day × 3 days × 2 people = 12,000.
    expect(breakdown).toEqual({ stay: 4800, food: 3000, transport: 1800, activities: 2400 });
  });
});

describe('rankForInterests', () => {
  it('leans towards what the traveller loves, then fame', () => {
    const lake = place(9, 'A', 'water', ['nature', 'photography', 'relaxation']);
    const ranked = rankForInterests([...PLACES, lake], ['nature']);
    expect(ranked[0].id).toBe(lake.id);
    expect(rankForInterests(PLACES, [])[0].id).toBe('p_A1');
  });
});
