/**
 * passport.service.test.ts — turning trips and journals into a passport: which worlds are
 * lit, which Yatra marks are earned (and when), the stamps, and the numbers on the cover.
 */
import { describe, expect, it } from 'vitest';
import { buildPassport, type PassportInput, type TripLike } from '../src/services/passport.js';

const TODAY = '2026-10-19';

/** A trip for the tests (completed by default: it ended before today). */
function trip(overrides: Partial<TripLike> = {}): TripLike {
  return { id: `t${Math.random()}`, destination: 'Manali', startDate: '2026-07-01', endDate: '2026-07-07', travellers: 'family', region: 'himalaya', ...overrides };
}

/** Build a passport with sensible defaults. */
function passport(overrides: Partial<PassportInput> = {}) {
  return buildPassport({
    user: { name: 'Asha Rao', username: 'asharao', bio: '', travellerType: null, homeCity: '', createdAt: '2026-09-01T10:00:00.000Z', theme: null },
    trips: [],
    journals: [],
    destinations: [
      { name: 'Bali', country: 'Indonesia', vibes: ['beach', 'culture'] },
      { name: 'Goa', country: 'India', vibes: ['beach'], region: 'konkan', localName: 'गोवा' },
    ],
    today: TODAY,
    includeUpcoming: true,
    includeJournal: true,
    ...overrides,
  });
}

/** Ids of earned marks. */
const earned = (p: ReturnType<typeof passport>) => p.marks.filter((m) => m.earnedAt).map((m) => m.id);

describe('buildPassport', () => {
  it('starts empty: no worlds, no marks, zero stats, a next world to unlock', () => {
    const p = passport();
    expect(p.worlds).toHaveLength(7);
    expect(p.worlds.every((w) => !w.visited)).toBe(true);
    expect(p.marks).toHaveLength(12);
    expect(earned(p)).toEqual([]);
    expect(p.stats).toEqual({ trips: 0, worlds: 0, daysAway: 0, marks: 0 });
    expect(p.nextWorld).not.toBeNull();
    expect(p.nextWorld!.line).toMatch(/^Next to unlock: /);
  });

  it('lights the world and earns the right marks for a 7-day family trip to the Himalaya in July', () => {
    const p = passport({ trips: [trip()] });
    expect(p.worlds.filter((w) => w.visited).map((w) => w.key)).toEqual(['himalaya']);
    expect(p.stats).toMatchObject({ trips: 1, worlds: 1, daysAway: 7 });
    expect(earned(p).sort()).toEqual(['family-yatri', 'first-steps', 'long-road', 'monsoon-chaser', 'mountain-goat']);
    expect(p.marks.find((m) => m.id === 'first-steps')!.earnedAt).toBe('2026-07-07');
    expect(p.stats.marks).toBe(5);
  });

  it('shows upcoming trips as stamps only (no worlds, no marks), and hides them when asked', () => {
    const upcoming = trip({ startDate: '2026-10-31', endDate: '2026-11-02', region: 'thar' });
    const p = passport({ trips: [upcoming] });
    expect(p.stamps).toHaveLength(1);
    expect(p.stamps[0]).toMatchObject({ status: 'upcoming', daysUntil: 12 });
    expect(p.worlds.some((w) => w.visited)).toBe(false);
    expect(earned(p)).toEqual([]);
    expect(passport({ trips: [upcoming], includeUpcoming: false }).stamps).toEqual([]);
  });

  it('earns Storyteller after three written memories', () => {
    const trips = [trip({ id: 'a' }), trip({ id: 'b', startDate: '2026-08-01', endDate: '2026-08-02' }), trip({ id: 'c', startDate: '2026-09-01', endDate: '2026-09-02' })];
    const journals = trips.map((t, i) => ({ itineraryId: t.id, rating: 4, memory: `memory ${i}`, photos: [], updatedAt: `2026-09-1${i}T10:00:00.000Z` }));
    const p = passport({ trips, journals });
    expect(earned(p)).toContain('storyteller');
    expect(earned(p)).toContain('wanderer');
  });

  it('counts a beach trip abroad for Coast calling and Beyond India', () => {
    const p = passport({ trips: [trip({ destination: 'Bali', region: 'abroad', travellers: 'couple', startDate: '2026-03-01', endDate: '2026-03-04' })] });
    expect(earned(p).sort()).toEqual(['beyond-india', 'coast-calling', 'first-steps']);
    expect(p.abroadCount).toBe(1);
    expect(p.stats.worlds).toBe(0);
  });

  it('adds journal summaries to stamps only when allowed, with the first photo as the cover', () => {
    const t = trip({ id: 'goa', destination: 'Goa', region: 'konkan' });
    const journals = [{ itineraryId: 'goa', rating: 5, memory: 'Sunsets!', photos: [{ id: 'p1' }, { id: 'p2' }], updatedAt: '2026-08-01T00:00:00.000Z' }];
    const shown = passport({ trips: [t], journals });
    expect(shown.stamps[0].journal).toEqual({ rating: 5, hasMemory: true, photoCount: 2, coverPhotoUrl: '/api/photos/p1' });
    expect(shown.stamps[0].localName).toBe('गोवा');
    expect(passport({ trips: [t], journals, includeJournal: false }).stamps[0]).not.toHaveProperty('journal');
  });

  it('lists stamps newest first', () => {
    const p = passport({ trips: [trip({ id: 'old', startDate: '2026-01-01', endDate: '2026-01-02' }), trip({ id: 'new', startDate: '2026-09-01', endDate: '2026-09-02' })] });
    expect(p.stamps.map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('has no next world once all seven are visited', () => {
    const keys = ['himalaya', 'thar', 'ganga', 'deccan', 'ghats', 'konkan', 'sisters'] as const;
    const p = passport({ trips: keys.map((region, i) => trip({ id: region, region, startDate: `2026-0${(i % 9) + 1}-01`, endDate: `2026-0${(i % 9) + 1}-02` })) });
    expect(p.nextWorld).toBeNull();
    expect(earned(p)).toContain('all-seven');
    expect(earned(p)).toContain('three-worlds');
  });
});
