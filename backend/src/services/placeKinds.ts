/**
 * placeKinds.ts — what kind of place something is, from its Wikidata "instance of" labels
 * ("Hindu temple", "waterfall", "fort"…), and which traveller interests it suits.
 *
 * It's an allow-list: only places people travel to see get a kind; towns, villages,
 * universities, stations and the like get null and are left out of the catalogue. A short
 * deny-list goes first, for things whose types contain a place-like word but that aren't
 * places to visit (a "particular church" is a diocese, an "ecoregion" is a forest type,
 * a skyscraper is a "tower"). Rivers aren't stops either (ghats and boat rides cover them). Rules are
 * tried in order (most specific first) against every label, and the first match wins, so a
 * "step well" that is also a "reservoir" counts as heritage, not water.
 */
import type { Interest } from '../types/api.js';

/** The kinds of place in the catalogue. */
export type PlaceKind =
  | 'temple'
  | 'shrine'
  | 'ghat'
  | 'fort'
  | 'palace'
  | 'museum'
  | 'wildlife'
  | 'heritage'
  | 'beach'
  | 'water'
  | 'garden'
  | 'nature'
  | 'market'
  | 'monument';

/** One rule: a pattern over a label, the kind it means, and the interests that kind suits. */
interface Rule {
  kind: PlaceKind;
  pattern: RegExp;
  interests: Interest[];
}

/** Most specific first. Patterns use word boundaries so "fortune" isn't a fort. */
const RULES: Rule[] = [
  { kind: 'temple', pattern: /\b(temple|mandir|devasthanam)s?\b/, interests: ['spiritual', 'culture', 'history'] },
  {
    kind: 'shrine',
    pattern: /\b(church|cathedral|basilica|chapel|mosque|masjid|dargah|gurudwara|gurdwara|monastery|gompa|stupa|synagogue|shrine|ashram)s?\b/,
    interests: ['spiritual', 'culture', 'history'],
  },
  { kind: 'ghat', pattern: /\bghats?\b/, interests: ['spiritual', 'culture', 'photography'] },
  { kind: 'fort', pattern: /\b(fort|fortress|fortification|citadel|castle)s?\b/, interests: ['history', 'culture', 'photography'] },
  { kind: 'palace', pattern: /\b(palace|mahal|haveli)s?\b/, interests: ['history', 'culture', 'photography'] },
  { kind: 'museum', pattern: /\b(museum|art gallery|gallery)s?\b/, interests: ['culture', 'history'] },
  {
    kind: 'wildlife',
    pattern: /\b(national park|wildlife|sanctuary|tiger reserve|biosphere reserve|conservation reserve|zoo|zoological)\b/,
    interests: ['nature', 'adventure', 'photography'],
  },
  {
    kind: 'heritage',
    pattern: /\b(archaeological site|ruins?|heritage site|world heritage site|step ?well|stepwell|cave temple|rock-cut|pavilion)s?\b/,
    interests: ['history', 'culture', 'photography'],
  },
  { kind: 'beach', pattern: /\bbeach(es)?\b/, interests: ['relaxation', 'nature', 'photography'] },
  { kind: 'water', pattern: /\b(lake|waterfall|falls|reservoir|dam|lagoon|backwaters?)s?\b/, interests: ['nature', 'photography', 'relaxation'] },
  { kind: 'garden', pattern: /\b(garden|botanical garden|park)s?\b/, interests: ['relaxation', 'nature'] },
  {
    kind: 'nature',
    pattern: /\b(hill|mountain|peak|valley|mountain pass|glacier|forest|plateau|cave|gorge|canyon|desert|dunes?|island|viewpoint)s?\b/,
    interests: ['nature', 'adventure', 'photography'],
  },
  { kind: 'market', pattern: /\b(market|bazaar|bazar|shopping street|shopping centre|shopping mall)s?\b/, interests: ['shopping', 'food', 'culture'] },
  {
    kind: 'monument',
    pattern: /\b(statue|sculpture|tomb|mausoleum|memorial|monument|tower|gate|gateway|minaret|minar|pillar|stepped tank|bridge)s?\b/,
    interests: ['history', 'photography'],
  },
];

/** Types that rule an item out, whatever else it is. */
const DENY =
  /\b(diocese|archdiocese|eparchy|particular church|ecoregion|district|tehsil|taluka|subdistrict|constituency|administrative|municipality|municipal corporation|census town|human settlement|village|neighbourhood|neighborhood|suburb|railway station|university|college|school|hospital|company|airport|skyscraper|high-rise building|office building|residential building|hotel|railway bridge|rail bridge|road bridge)\b/;

/** The place's kind and interests, or null if it isn't a travel place. */
export function classify(typeLabels: string[]): { kind: PlaceKind; interests: Interest[] } | null {
  const labels = typeLabels.map((label) => label.toLowerCase());
  if (labels.some((label) => DENY.test(label))) return null;
  for (const rule of RULES) {
    if (labels.some((label) => rule.pattern.test(label))) return { kind: rule.kind, interests: [...rule.interests] };
  }
  return null;
}
