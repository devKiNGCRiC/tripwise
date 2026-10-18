/**
 * labels.ts — how profile values read in the interface (shared by the Account tab, the
 * passport cover and friend cards).
 */
import type { PassportVisibility, TravellerType } from '@/lib/api/types';

/** Each traveller type, as people read it. */
export const TRAVELLER_TYPE_LABEL: Record<TravellerType, string> = {
  'solo-explorer': 'Solo explorer',
  backpacker: 'Backpacker',
  couple: 'Couple getaways',
  'family-planner': 'Family planner',
  'group-organiser': 'Group organiser',
  luxury: 'Luxury escapist',
  foodie: 'Foodie',
  'culture-seeker': 'Culture seeker',
  adventure: 'Adventure junkie',
  'slow-traveller': 'Slow traveller',
};

/** Who can see a passport, with a line explaining each choice. */
export const VISIBILITY_CHOICES: [PassportVisibility, string, string][] = [
  ['friends', 'Friends', 'Only people you are friends with'],
  ['everyone', 'Everyone', 'Anyone with your @username link, even without an account'],
  ['private', 'Only me', "Nobody else, and people can't find you by @username"],
];
