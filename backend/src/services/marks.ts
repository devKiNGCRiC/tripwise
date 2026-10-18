/**
 * marks.ts — the twelve Yatra marks: badges earned only by travelling (never bought).
 * Each has an emoji, a name and a one-line "how to earn". Whether and when a traveller
 * earned each one is worked out in passport.ts from their completed trips and journals.
 */

/** One Yatra mark. */
export interface MarkInfo {
  id: string;
  emoji: string;
  name: string;
  how: string;
}

/** Every mark, in the order the passport shows them. */
export const MARKS: MarkInfo[] = [
  { id: 'first-steps', emoji: '🎒', name: 'First steps', how: 'Finish your first trip' },
  { id: 'wanderer', emoji: '🧭', name: 'Wanderer', how: 'Finish 3 trips' },
  { id: 'mountain-goat', emoji: '🏔', name: 'Mountain goat', how: 'Take a trip in the Himalaya' },
  { id: 'desert-wind', emoji: '🏜', name: 'Desert wind', how: 'Take a trip in the Thar' },
  { id: 'coast-calling', emoji: '🌊', name: 'Coast calling', how: 'Take a trip on the Konkan & Malabar coast, or to a beach abroad' },
  { id: 'monsoon-chaser', emoji: '🌧', name: 'Monsoon chaser', how: 'Start a trip between June and September' },
  { id: 'family-yatri', emoji: '👨‍👩‍👧', name: 'Family yatri', how: 'Take a family trip' },
  { id: 'long-road', emoji: '🛣', name: 'Long road', how: 'Take one trip of 7 days or more' },
  { id: 'storyteller', emoji: '✍️', name: 'Storyteller', how: 'Write 3 trip memories' },
  { id: 'beyond-india', emoji: '🌏', name: 'Beyond India', how: 'Take a trip abroad' },
  { id: 'three-worlds', emoji: '🗺', name: 'Three worlds', how: 'Visit 3 of the seven worlds' },
  { id: 'all-seven', emoji: '🪷', name: 'All seven worlds', how: 'Visit all seven worlds' },
];
