/**
 * places.test.ts — a destination's places through the API client (served by the mock, which
 * reads the same catalogue files as the real API): most famous first, an interest filter,
 * a 404 for an unknown destination, and the whole catalogue in Explore.
 */
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { destinationsApi } from './endpoints';

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
});
