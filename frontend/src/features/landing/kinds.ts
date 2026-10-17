/**
 * kinds.ts — the kinds of traveller TripWise plans for, with what changes for each.
 * `who` is the value the planner's "Who's going" select uses.
 */
export interface TravellerKind {
  title: 'Solo' | 'Friends' | 'Backpackers' | 'Family' | 'Couples';
  who: string;
  line: string;
  perks: [string, string, string];
}

export const KINDS: TravellerKind[] = [
  { title: 'Solo', who: 'Just me', line: 'Freedom, safety and good company when you want it.', perks: ['Safe, social stays', 'Flexible day plans', 'Meet-up spots & walks'] },
  { title: 'Friends', who: 'Friends', line: 'One plan, everyone’s ideas, nobody doing maths at the end.', perks: ['Costs split fairly', 'Vote on the plan', 'Shared checklist'] },
  { title: 'Backpackers', who: 'Backpacking', line: 'Go further for less, without missing the good stuff.', perks: ['₹ shoestring routes', 'Overnight trains & buses', 'Street-food maps'] },
  { title: 'Family', who: 'Family', line: 'Gentle days that work for grandparents and toddlers alike.', perks: ['Easy pacing & rest stops', 'Kid-friendly sights', 'Rooms for everyone'] },
  { title: 'Couples', who: 'Partner', line: 'Sunsets, quiet corners and one well-timed splurge.', perks: ['Sunset timing', 'Quiet, scenic stays', 'A little splurge'] },
];
