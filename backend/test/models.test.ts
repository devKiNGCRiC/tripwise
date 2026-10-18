/**
 * models.test.ts — database rules (unique emails) and the public shapes sent to the website.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Itinerary, User } from '../src/db/models/index.js';
import { publicItinerary, publicUser } from '../src/db/toPublic.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** A minimal valid trip request. */
const request = {
  destination: 'Goa',
  startDate: '2026-11-01',
  endDate: '2026-11-01',
  budget: { amount: 3000, currency: 'INR' },
  travellers: 'couple',
  interests: ['food'],
  pace: 'balanced',
};

describe('models', () => {
  it('treats emails case-insensitively and keeps them unique', async () => {
    await User.create({ name: 'A', email: 'A@x.com', passwordHash: 'h' });
    await expect(User.create({ name: 'B', email: 'a@x.com', passwordHash: 'h' })).rejects.toThrow(/duplicate key/);
  });

  it('gives new users the free plan, the user role and not blocked', async () => {
    const user = await User.create({ name: 'A', email: 'a@x.com', passwordHash: 'h' });
    expect(user.plan).toBe('free');
    expect(user.role).toBe('user');
    expect(user.blocked).toBe(false);
  });

  it('publicUser exposes id and never the password hash', async () => {
    const user = await User.create({ name: 'A', email: 'a@x.com', passwordHash: 'secret-hash' });
    const shown = publicUser(user);
    expect(shown.id).toBe(user._id.toString());
    expect(JSON.stringify(shown)).not.toContain('secret-hash');
    expect(shown).not.toHaveProperty('passwordHash');
    expect(typeof shown.createdAt).toBe('string');
  });

  it('publicItinerary exposes id and hides the owner and cache bookkeeping', async () => {
    const user = await User.create({ name: 'A', email: 'a@x.com', passwordHash: 'h' });
    const trip = await Itinerary.create({
      ownerId: user._id,
      request,
      title: '1 day in Goa',
      summary: 'Sun.',
      days: [{ dayNumber: 1, date: '2026-11-01', theme: 'Beaches', activities: [{ time: 'morning', title: 'Swim', description: 'Sea.' }] }],
      estimatedCost: { total: 10, breakdown: { stay: 1, food: 2, transport: 3, activities: 4 }, currency: 'INR' },
      tips: [],
      packingList: [],
      provider: 'gemini',
      source: 'ai',
      cacheVariantId: 'v1',
    });
    const shown = publicItinerary(trip);
    expect(shown.id).toBe(trip._id.toString());
    expect(shown).not.toHaveProperty('ownerId');
    expect(shown).not.toHaveProperty('cacheVariantId');
    expect(shown).not.toHaveProperty('_id');
    expect(shown.days[0].activities[0]).not.toHaveProperty('_id');
    expect(shown.request.destination).toBe('Goa');
  });
});
