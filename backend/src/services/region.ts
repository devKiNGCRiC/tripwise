/**
 * region.ts — which of India's seven worlds a trip belongs to (or "abroad").
 *
 * The catalogue knows its own places best, so a catalogue destination's world always wins;
 * a catalogue place outside India is "abroad". For anywhere else we use the world the AI
 * named when it wrote the plan ("none" means it couldn't tell).
 */
import { Destination } from '../db/models/index.js';
import { REGION_KEYS, type RegionKey } from '../lib/enums.js';

/** A trip's world: one of the seven, abroad, or unknown (null). */
export type TripRegion = RegionKey | 'abroad' | null;

/** Escape text so it can be matched literally in a regular expression. */
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Decide a trip's world from its destination and the AI's guess. */
export async function regionFor(destination: string, aiRegion: string | undefined): Promise<TripRegion> {
  const place = await Destination.findOne({ name: new RegExp(`^${escapeRegex(destination.trim())}$`, 'i') }, { region: 1, country: 1 }).lean();
  if (place) {
    if (place.country !== 'India') return 'abroad';
    if (place.region) return place.region as RegionKey;
  }
  if (aiRegion === 'abroad') return 'abroad';
  return (REGION_KEYS as readonly string[]).includes(aiRegion ?? '') ? (aiRegion as RegionKey) : null;
}
