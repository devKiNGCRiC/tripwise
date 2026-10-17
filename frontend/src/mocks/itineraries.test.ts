/**
 * itineraries.test.ts — the mock AI planner behaves like the real API will:
 * generates timed day-by-day plans, enforces 5 plans a day, keeps trips private,
 * shares read-only links, regenerates one day, deletes, and reports a busy AI.
 * Goes through the real api client and endpoint helpers.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '@/lib/api/client';
import { itinerariesApi, meApi, shareApi } from '@/lib/api/endpoints';
import type { TripRequest } from '@/lib/api/types';
import { buildDay } from './data/generator';
import { db, loadSavedTrips, saveTrips, session } from './db';

/** A 3-day Goa trip for two. */
const goaTrip: TripRequest = {
  destination: 'Goa',
  startDate: '2026-12-12',
  endDate: '2026-12-14',
  budget: { amount: 3000, currency: 'INR' },
  travellers: 'couple',
  interests: ['food', 'relaxation'],
  pace: 'balanced',
};

/** Log in as a seed user via the mock session (like a page refresh would). */
async function loginAs(userId: string) {
  session.set(userId);
  await api.refreshSession();
}

describe('mock itinerary API', () => {
  beforeEach(() => loginAs('u_demo'));

  it('generates a timed day-by-day plan and counts it against the quota', async () => {
    const { itinerary, quota } = await itinerariesApi.generate(goaTrip);
    expect(itinerary.days).toHaveLength(3);
    expect(itinerary.days.map((d) => d.date)).toEqual(['2026-12-12', '2026-12-13', '2026-12-14']);
    const day = itinerary.days[0];
    expect(day.activities).toHaveLength(3);
    expect(day.activities[0].startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(day.activities[0].transfer?.minutes).toBeGreaterThan(0);
    expect(day.activities.at(-1)?.transfer).toBeUndefined();
    expect(itinerary.estimatedCost.total).toBeGreaterThan(0);
    expect(itinerary.packingList.length).toBeGreaterThan(0);
    expect(quota).toMatchObject({ used: 1, limit: 5 });
    expect((await meApi.quota()).quota.used).toBe(1);
  });

  it('refuses a sixth plan in a day with QUOTA_EXCEEDED', async () => {
    for (let i = 0; i < 5; i++) await itinerariesApi.generate(goaTrip);
    await expect(itinerariesApi.generate(goaTrip)).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });

  it('keeps trips private to their owner', async () => {
    const { itinerary } = await itinerariesApi.generate(goaTrip);
    expect((await itinerariesApi.list()).itineraries.map((t) => t.id)).toEqual([itinerary.id]);

    await loginAs('u_admin');
    expect((await itinerariesApi.list()).itineraries).toEqual([]);
    await expect(itinerariesApi.get(itinerary.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('shares a read-only link anyone can open', async () => {
    const { itinerary } = await itinerariesApi.generate(goaTrip);
    const { shareId } = await itinerariesApi.share(itinerary.id);
    api.setAccessToken(null);
    session.clear();
    expect((await shareApi.get(shareId)).itinerary.title).toBe(itinerary.title);
    await expect(shareApi.get('nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('regenerates just one day', async () => {
    const { itinerary } = await itinerariesApi.generate(goaTrip);
    const { itinerary: updated } = await itinerariesApi.regenerateDay(itinerary.id, 2);
    expect(updated.days[0]).toEqual(itinerary.days[0]);
    expect(updated.days[2]).toEqual(itinerary.days[2]);
    expect(updated.days[1]).not.toEqual(itinerary.days[1]);
  });

  it('deletes a trip', async () => {
    const { itinerary } = await itinerariesApi.generate(goaTrip);
    await itinerariesApi.remove(itinerary.id);
    expect((await itinerariesApi.list()).itineraries).toEqual([]);
  });

  it('reports a busy AI with AI_UNAVAILABLE', async () => {
    await expect(itinerariesApi.generate({ ...goaTrip, destination: 'fail-ai' })).rejects.toMatchObject({ code: 'AI_UNAVAILABLE' });
  });

  it('never repeats a stop within a day, and keeps dawn and evening ideas at the right time', () => {
    const goa = db.destinations.find((d) => d.slug === 'goa');
    const req = { ...goaTrip, pace: 'packed' as const, interests: ['food', 'spiritual', 'nightlife', 'nature', 'photography'] as TripRequest['interests'] };
    for (let n = 1; n <= 10; n++) {
      const day = buildDay(req, goa, '2026-12-12', n, n);
      const titles = day.activities.map((a) => a.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const a of day.activities) {
        const hour = Number(a.startTime!.slice(0, 2));
        if (/dawn|first light/i.test(a.title)) expect(hour).toBeLessThan(11);
        if (/evening|sunset|night|aarti|blue-hour/i.test(a.title)) expect(hour).toBeGreaterThanOrEqual(16);
      }
    }
  });
});

describe('mock trip storage', () => {
  it('keeps planned trips across page reloads (saved in the browser)', async () => {
    await loginAs('u_demo');
    const { itinerary } = await itinerariesApi.generate(goaTrip);
    saveTrips();
    const saved = loadSavedTrips();
    expect(saved.itineraries.map((t: { id: string }) => t.id)).toEqual([itinerary.id]);
    expect(saved.generations.u_demo.used).toBe(1);
  });

  it('ignores corrupt saved trips instead of crashing', () => {
    localStorage.setItem('tw_mock_trips', JSON.stringify({ itineraries: [null, { id: 'x' }, 5], generations: null }));
    expect(loadSavedTrips()).toEqual({ itineraries: [], generations: {} });
  });
});
