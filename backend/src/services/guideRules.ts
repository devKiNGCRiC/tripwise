/**
 * guideRules.ts — checking an AI-written destination guide against its sources before it is saved
 * (no imports, so the writer script and tests share exactly the same rules).
 *   - every dish must appear in the source text; every thing to do must mostly use the source's own
 *     words — invented items are dropped
 *   - too few items left, or a missing or over-long section → the guide is rejected (with reasons)
 *   - prices and phone numbers are taken out (they go out of date and aren't ours to vouch for)
 */

/** One thing to do. */
export interface GuideThing {
  title: string;
  detail: string;
}

/** One local dish. */
export interface GuideFood {
  name: string;
  detail: string;
}

/** Where a guide's text came from (credited on the page). */
export interface GuideSource {
  title: string;
  url: string;
  licence: string;
}

/** A destination's guide, as stored in the catalogue. */
export interface Guide {
  about: string;
  history: string;
  significance: string;
  thingsToDo: GuideThing[];
  food: GuideFood[];
  sources: GuideSource[];
  /** When it was written and checked ("YYYY-MM-DD"). */
  checked: string;
}

/** Section lengths (characters): [shortest, longest]. */
const LENGTH = { about: [80, 900], history: [60, 700], significance: [40, 400] } as const;
/** How many things to do and dishes: [fewest after checking, most kept]. */
const THINGS = [5, 10] as const;
const FOOD = [3, 8] as const;
/** Share of a thing-to-do title's key words that must be in the sources. */
const GROUNDED_SHARE = 0.6;
/** Everyday verbs and words that don't name anything. */
const GENERIC = new Set(['visit', 'stroll', 'ride', 'drive', 'explore', 'take', 'walk', 'enjoy', 'watch', 'trek', 'hike', 'climb', 'catch', 'shop', 'taste', 'try', 'spend', 'head', 'over', 'from', 'with', 'into', 'along', 'through', 'around', 'your', 'their', 'this', 'that', 'some', 'local', 'evening', 'morning', 'sunrise', 'sunset', 'early', 'day', 'trip', 'tour', 'view', 'views']);

/** Words that describe food without naming a dish ("snacks", "cold and warm drinks"). */
const VAGUE_FOOD = new Set(['snack', 'snacks', 'drink', 'drinks', 'food', 'foods', 'meal', 'meals', 'dish', 'dishes', 'cuisine', 'local', 'street', 'cold', 'warm', 'hot', 'and', 'or', 'veg', 'vegetarian', 'non', 'fresh', 'various', 'other', 'traditional', 'indian']);

/** Text compared word by word: lower case, no accents, no punctuation, single spaces. */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Text for matching dish names however they're spelt in English: "ee"→"i", "oo"→"u", doubled letters once (baati = bati, kheer = khir, laddoo = laddu). */
function canon(text: string): string {
  return normalise(text).replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/([a-z])\1+/g, '$1');
}

/** Text without prices or phone numbers (and the gaps they leave). */
function clean(text: string): string {
  return text
    .replace(/(?:₹|\brs\.?|\binr)\s?[\d,]+(?:\s?(?:a|per)\s\w+)?/gi, '')
    // Phone numbers have 10+ digits ("+91 98765 43210"); year ranges ("1816-1817") have 8.
    .replace(/\+?\d[\d\s-]{7,}\d/g, (match) => (match.replace(/\D/g, '').length >= 10 ? '' : match))
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[—–-]\s*(?:about|call|costs?)?\s*[,.]?\s*$/i, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Is a dish named in the sources (as whole words, however it's spelt) — and is it a dish, not just "snacks"? */
const dishInSources = (name: string, source: string) =>
  !!canon(name) && ` ${source} `.includes(` ${canon(name)} `) && normalise(name).split(' ').some((w) => !VAGUE_FOOD.has(w));

/** Do most of a title's key words appear in the sources? */
function thingInSources(title: string, sourceWords: Set<string>) {
  const words = normalise(title)
    .split(' ')
    .filter((w) => w.length >= 4 && !GENERIC.has(w));
  if (!words.length) return false;
  return words.filter((w) => sourceWords.has(w)).length / words.length >= GROUNDED_SHARE;
}

/** A string field, or ''. */
const text = (value: unknown) => (typeof value === 'string' ? clean(value) : '');
/** A list of {a, b} string pairs (anything else dropped). */
function pairs(value: unknown, a: string, b: string): Record<string, string>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const x = item as Record<string, unknown>;
    return typeof x?.[a] === 'string' && typeof x?.[b] === 'string' && x[a].trim() ? [{ [a]: clean(x[a] as string), [b]: clean(x[b] as string) }] : [];
  });
}

/** Check a draft guide against its sources: the guide to save, or why not. */
export function checkGuide(draft: unknown, sourceText: string, meta: { sources: GuideSource[]; checked: string }): { ok: true; guide: Guide } | { ok: false; reasons: string[] } {
  const d = (draft && typeof draft === 'object' ? draft : {}) as Record<string, unknown>;
  const source = normalise(sourceText);
  const sourceWords = new Set(source.split(' '));
  const sourceForDishes = canon(sourceText);
  const reasons: string[] = [];

  const sections = { about: text(d.about), history: text(d.history), significance: text(d.significance) };
  for (const [key, [min, max]] of Object.entries(LENGTH) as [keyof typeof LENGTH, readonly [number, number]][]) {
    const length = sections[key].length;
    if (length < min || length > max) reasons.push(`${key}: ${length} characters (needs ${min}–${max})`);
  }

  // Keep only grounded items, each once.
  const seen = new Set<string>();
  const once = (key: string) => !seen.has(key) && !!seen.add(key);
  const thingsToDo = (pairs(d.thingsToDo, 'title', 'detail') as unknown as GuideThing[]).filter((t) => thingInSources(t.title, sourceWords) && once(`t:${normalise(t.title)}`)).slice(0, THINGS[1]);
  const food = (pairs(d.food, 'name', 'detail') as unknown as GuideFood[]).filter((f) => dishInSources(f.name, sourceForDishes) && once(`f:${normalise(f.name)}`)).slice(0, FOOD[1]);
  if (thingsToDo.length < THINGS[0]) reasons.push(`thingsToDo: only ${thingsToDo.length} found in the sources (needs ${THINGS[0]})`);
  if (food.length < FOOD[0]) reasons.push(`food: only ${food.length} dishes found in the sources (needs ${FOOD[0]})`);

  if (reasons.length) return { ok: false, reasons };
  return { ok: true, guide: { ...sections, thingsToDo, food, sources: meta.sources, checked: meta.checked } };
}
