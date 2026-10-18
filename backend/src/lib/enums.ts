/**
 * enums.ts — the fixed lists of values the API accepts, in one place, so routes, models and
 * validation all agree (and match frontend/src/lib/api/types.ts).
 */

/** Things a trip can lean towards. */
export const INTERESTS = ['food', 'culture', 'adventure', 'nightlife', 'nature', 'shopping', 'history', 'relaxation', 'photography', 'spiritual'] as const;
/** How full each day is. */
export const PACES = ['chill', 'balanced', 'packed'] as const;
/** Who is travelling. */
export const TRAVELLERS = ['solo', 'couple', 'friends', 'family'] as const;
/** The kind of traveller someone says they are (shown on their passport). */
export const TRAVELLER_TYPES = [
  'solo-explorer',
  'backpacker',
  'couple',
  'family-planner',
  'group-organiser',
  'luxury',
  'foodie',
  'culture-seeker',
  'adventure',
  'slow-traveller',
] as const;
/** Who can see a passport. */
export const PASSPORT_VISIBILITY = ['friends', 'everyone', 'private'] as const;
/** India's seven worlds, in their fixed order. */
export const REGION_KEYS = ['himalaya', 'thar', 'ganga', 'deccan', 'ghats', 'konkan', 'sisters'] as const;

export type TravellerType = (typeof TRAVELLER_TYPES)[number];
export type PassportVisibility = (typeof PASSPORT_VISIBILITY)[number];
export type RegionKey = (typeof REGION_KEYS)[number];
