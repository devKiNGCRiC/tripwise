/**
 * worlds.ts — India's seven worlds, as the passport needs them: their names, their best
 * months to visit, a short season line and a place to suggest for a first trip there.
 * (The website's living landscapes live in frontend/src/world/regions.ts; keys and names match.)
 */
import type { RegionKey } from '../lib/enums.js';

/** One world, for the passport. */
export interface WorldInfo {
  key: RegionKey;
  name: string;
  /** 1 = January … 12 = December */
  bestMonths: number[];
  /** Completes "Next to unlock: {name}. …" */
  season: string;
  /** A catalogue place to suggest planning ("Plan it →"). */
  suggest: string;
}

/** The seven worlds in their fixed order. */
export const WORLDS: WorldInfo[] = [
  { key: 'himalaya', name: 'Himalaya', bestMonths: [5, 6, 7, 8, 9, 10], season: 'Best May to Oct, when the passes open', suggest: 'Manali' },
  { key: 'thar', name: 'Thar', bestMonths: [10, 11, 12, 1, 2, 3], season: 'Best Oct to Mar, when the desert nights turn cool', suggest: 'Jaipur' },
  { key: 'ganga', name: 'Gangetic Plains', bestMonths: [10, 11, 12, 1, 2, 3], season: 'Best Oct to Mar, for misty ghats and festivals', suggest: 'Varanasi' },
  { key: 'deccan', name: 'Deccan Plateau', bestMonths: [10, 11, 12, 1, 2], season: 'Best Oct to Feb, when the old stones are cool to climb', suggest: 'Hampi' },
  { key: 'ghats', name: 'Western Ghats', bestMonths: [6, 7, 8, 9, 10], season: 'Best Jun to Oct for the monsoon green', suggest: 'Coorg' },
  { key: 'konkan', name: 'Konkan & Malabar', bestMonths: [11, 12, 1, 2, 3], season: 'Best Nov to Mar, for long beach sunsets', suggest: 'Goa' },
  { key: 'sisters', name: 'Seven Sisters', bestMonths: [10, 11, 12, 3, 4, 5], season: 'Best Oct to May, for clear hills and living root bridges', suggest: 'Shillong' },
];
