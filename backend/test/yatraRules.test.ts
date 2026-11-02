/**
 * yatraRules.test.ts — the on-the-trip rules shared by the API and the website's demo mock:
 *   nearestPlace     which catalogue place someone is near, and how far (km, one decimal)
 *   roundPosition    about-1-km positions for Kushal links
 *   mapsLink         the link that opens the phone's maps app
 *   sharingUntil     when location sharing ends (1 hour / the Sangam / the trip's end)
 *   headcount        who's at the Sangam and who's missing (members only)
 *   isValidPosition  a real latitude and longitude
 */
import { describe, expect, it } from 'vitest';
import { headcount, isValidPosition, mapsLink, nearestPlace, roundPosition, sharingUntil } from '../src/services/yatraRules.js';

const NOW = '2026-11-02T10:00:00.000Z';

describe('nearestPlace', () => {
  const places = [
    { name: 'Fort Kochi beach', lat: 9.9658, lon: 76.2421 },
    { name: 'Alleppey Lighthouse', lat: 9.4955, lon: 76.3268 },
  ];

  it('finds the closest place and how far it is', () => {
    // Kochi city centre: about 4.7 km from Fort Kochi beach.
    expect(nearestPlace(9.9312, 76.2673, places)).toEqual({ name: 'Fort Kochi beach', km: 4.7 });
    expect(nearestPlace(9.5, 76.33, places)?.name).toBe('Alleppey Lighthouse');
  });

  it('has nothing to say without places', () => {
    expect(nearestPlace(9.9, 76.2, [])).toBeNull();
  });
});

describe('positions', () => {
  it('rounds to about a kilometre and links to maps', () => {
    expect(roundPosition(9.93124, 76.26731)).toEqual({ lat: 9.93, lon: 76.27 });
    expect(mapsLink(9.93, 76.27)).toBe('https://www.google.com/maps?q=9.93,76.27');
  });

  it('accepts only real latitudes and longitudes', () => {
    expect(isValidPosition(9.9, 76.2)).toBe(true);
    for (const [lat, lon] of [[91, 0], [0, 181], [Number.NaN, 0], ['9.9', 76.2], [null, null]]) expect(isValidPosition(lat, lon)).toBe(false);
  });
});

describe('sharingUntil', () => {
  it('lasts an hour, until the Sangam, or until the trip ends', () => {
    expect(sharingUntil('1h', NOW)).toBe('2026-11-02T11:00:00.000Z');
    expect(sharingUntil('sangam', NOW, '2026-11-02T11:30:00.000Z')).toBe('2026-11-02T11:30:00.000Z');
    expect(sharingUntil('trip', NOW, null, '2026-11-05T18:29:59.999Z')).toBe('2026-11-05T18:29:59.999Z');
  });

  it('has no end to offer when the Sangam or trip is missing or over', () => {
    expect(sharingUntil('sangam', NOW)).toBeNull();
    expect(sharingUntil('sangam', NOW, '2026-11-02T09:00:00.000Z')).toBeNull();
    expect(sharingUntil('trip', NOW, null, null)).toBeNull();
    expect(sharingUntil('trip', NOW, null, '2026-11-01T00:00:00.000Z')).toBeNull();
  });
});

describe('headcount', () => {
  it('counts members only, in member order', () => {
    expect(headcount(['a', 'b', 'c'], ['c', 'x'])).toEqual({ here: ['c'], missing: ['a', 'b'] });
  });
});
