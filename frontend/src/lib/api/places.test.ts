/**
 * places.test.ts — a destination's places through the API client (served by the mock, which
 * reads the same catalogue files as the real API): most famous first, an interest filter,
 * a 404 for an unknown destination, the whole catalogue in Explore, and TripWise's own
 * Quick plan (no AI) built from those places.
 */
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { api } from './client';
import { destinationsApi, itinerariesApi } from './endpoints';
import type { TripRequest } from './types';
import { session } from '@/mocks/db';

describe('destination places', () => {
  it('lists places most famous first, and filters by interest', async () => {
    const { places } = await destinationsApi.places('hampi');
    expect(places.map((p) => p.name)).toContain('Virupaksha Temple');
    expect(places.map((p) => p.fame)).toEqual([...places.map((p) => p.fame)].sort((a, b) => b - a));
    const { places: nature } = await destinationsApi.places('coorg', 'nature');
    expect(nature.length).toBeGreaterThan(0);
    nature.forEach((p) => expect(p.interests).toContain('nature'));
  });

  it("404s a destination that doesn't exist", async () => {
    await expect(destinationsApi.places('atlantis')).rejects.toBeInstanceOf(ApiError);
  });

  it('Explore has every world, from the shared catalogue', async () => {
    const { destinations } = await destinationsApi.list();
    const worlds = new Set(destinations.map((d) => d.region).filter(Boolean));
    expect([...worlds].sort()).toEqual(['deccan', 'ganga', 'ghats', 'himalaya', 'konkan', 'sisters', 'thar']);
  });

  it("makes a Quick plan from the catalogue, and says when it doesn't know a place", async () => {
    session.set('u_demo');
    await api.refreshSession();
    const start = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
    const req = { destination: 'Hampi', startDate: start, endDate: end, budget: { amount: 3000, currency: 'INR' }, travellers: 'couple', interests: ['history'], pace: 'balanced' } satisfies TripRequest;
    const { itinerary } = await itinerariesApi.quick(req);
    expect(itinerary).toMatchObject({ provider: 'tripwise', source: 'local', region: 'deccan' });
    expect(itinerary.days).toHaveLength(2);
    expect(itinerary.days[0].activities[0].place?.id).toMatch(/^p_Q/);
    await expect(itinerariesApi.quick({ ...req, destination: 'Atlantis' })).rejects.toMatchObject({ code: 'NO_CATALOGUE' });
  });
});
