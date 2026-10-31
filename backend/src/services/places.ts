/**
 * places.ts — plans grounded in the places catalogue (retrieval for the AI planner):
 *   findDestination  which catalogue destination a typed place means ("Hampi, Karnataka",
 *                    "Leh", "Alleppey"…), or null
 *   rankPlaces       a destination's places ordered for a traveller: fame, plus a strong lean
 *                    towards their interests
 *   placesFor        the top few of those (the shortlist handed to the AI)
 *   groundingFor     everything a planning request needs: the shortlist and all places
 *   matchPlaces      links stops that name a catalogue place (even loosely, "Vittala" for
 *                    "Vitthala") to it, adding its id and coordinates
 * Retrieval is exact (destination + interest tags), which is accurate and free; semantic
 * search comes with the "Ask TripWise" chat.
 */
import { Destination, Place } from '../db/models/index.js';
import type { Interest } from '../types/api.js';

/** A catalogue place as the planner uses it. */
export interface PlanPlace {
  id: string;
  name: string;
  kind: string;
  interests: string[];
  lat: number;
  lon: number;
  fame: number;
}

/** A stop's link to a catalogue place. */
export interface PlaceLink {
  id: string;
  lat: number;
  lon: number;
}

/** Other names travellers type for catalogue destinations (plain form → slug). */
const ALIASES: Record<string, string> = {
  leh: 'ladakh',
  alleppey: 'kerala',
  alappuzha: 'kerala',
  kumarakom: 'kerala',
  'kerala backwaters': 'kerala',
  mcleodganj: 'dharamshala',
  'mcleod ganj': 'dharamshala',
  sohra: 'cherrapunji',
  aurangabad: 'ellora',
  'chhatrapati sambhajinagar': 'ellora',
  ajanta: 'ellora',
  bombay: 'mumbai',
  cochin: 'kochi',
  'fort kochi': 'kochi',
  mysore: 'mysuru',
  panaji: 'goa',
  panjim: 'goa',
  'new delhi': 'delhi',
  benares: 'varanasi',
  banaras: 'varanasi',
  kashi: 'varanasi',
  madikeri: 'coorg',
  kodagu: 'coorg',
  udhagamandalam: 'ooty',
  aihole: 'badami',
  pattadakal: 'badami',
  vijayapura: 'bijapur',
};

/** Lower-case letters and digits only (accents removed), for comparing names. */
export const plain = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The names a destination answers to: its slug, its name, and each part of a compound name. */
function namesOf(d: { slug: string; name: string }): string[] {
  const parts = d.name.split(/\s*(?:&|,|\(|\)|\band\b)\s*/i);
  return [plain(d.slug.replace(/-/g, ' ')), plain(d.name), ...parts.map(plain)].filter(Boolean);
}

/** The catalogue destination a typed place means, or null. */
export async function findDestination(text: string) {
  const whole = plain(text);
  if (!whole) return null;
  // "Hampi, Karnataka" → also try "hampi".
  const first = plain(text.split(',')[0]);
  const wanted = new Set([whole, first]);
  const all = await Destination.find({}, { _id: 0, slug: 1, name: 1, region: 1, country: 1 }).lean();
  const alias = ALIASES[whole] ?? ALIASES[first];
  if (alias) return all.find((d) => d.slug === alias) ?? null;
  return all.find((d) => namesOf(d).some((name) => wanted.has(name))) ?? null;
}

/** Score weight of each interest a place shares with the traveller. */
const INTEREST_WEIGHT = 3;

/** A destination's places, best first for these interests. */
export async function rankPlaces(slug: string, interests: readonly Interest[]): Promise<PlanPlace[]> {
  const places = (await Place.find({ destination: slug }, { _id: 0, id: 1, name: 1, kind: 1, interests: 1, lat: 1, lon: 1, fame: 1 }).lean()) as PlanPlace[];
  const score = (p: PlanPlace) => Math.log2(1 + p.fame) + INTEREST_WEIGHT * p.interests.filter((i) => interests.includes(i as Interest)).length;
  return places.sort((a, b) => score(b) - score(a) || b.fame - a.fame || a.name.localeCompare(b.name));
}

/** The top `n` places for these interests (none for destinations without places). */
export async function placesFor(slug: string, interests: readonly Interest[], n: number): Promise<PlanPlace[]> {
  return (await rankPlaces(slug, interests)).slice(0, n);
}

/** Places handed to the AI. */
export const SHORTLIST = 14;

/** What a planning request knows from the catalogue: the AI's shortlist and every place (for matching). */
export async function groundingFor(destination: string, interests: readonly Interest[]): Promise<{ shortlist: PlanPlace[]; all: PlanPlace[] }> {
  const found = await findDestination(destination);
  const all = found ? await rankPlaces(found.slug, interests) : [];
  return { shortlist: all.slice(0, SHORTLIST), all };
}

/** Words that say what a place is rather than which one (they don't identify it). */
const GENERIC = new Set(
  'the of and a an at in on sri shri shree temple temples fort palace lake falls waterfall museum beach church mosque masjid tomb gate garden gardens park national monastery cave caves hill hills river bridge mandir devi view point'.split(' '),
);

/** How alike two words are, 0–1 (1 − edit distance ÷ the longer length). */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return 1 - rows[a.length][b.length] / Math.max(a.length, b.length);
}

/** Is `word` (or a near spelling of it) among `words`? Short words must match exactly. */
const hasWord = (words: string[], word: string) => words.some((w) => w === word || (word.length >= 5 && similarity(w, word) >= 0.8));

/**
 * Stops with the catalogue place they name, if any. A place matches when every word that
 * identifies it (not "temple", not the destination's own name) appears in the stop's title
 * or area, allowing small spelling differences. The most specific match wins.
 */
export function matchPlaces<T extends { title: string; location?: string }>(stops: T[], places: PlanPlace[], destination: string): (T & { place?: PlaceLink })[] {
  const own = new Set(plain(destination).split(' '));
  const keyed = places
    .map((p) => ({ p, words: plain(p.name).split(' ').filter((w) => w.length > 1 && !GENERIC.has(w) && !own.has(w)) }))
    .filter((k) => k.words.length > 0);
  return stops.map((stop) => {
    const words = plain(`${stop.title} ${stop.location ?? ''}`).split(' ');
    const best = keyed
      .filter((k) => k.words.every((w) => hasWord(words, w)))
      .sort((a, b) => b.words.length - a.words.length || b.p.fame - a.p.fame)[0];
    return best ? { ...stop, place: { id: best.p.id, lat: best.p.lat, lon: best.p.lon } } : { ...stop };
  });
}
