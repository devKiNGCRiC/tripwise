/**
 * regions.ts — the seven worlds of India, divided by landscape rather than state lines.
 *
 * Each region carries everything the page shows about it (words, facts, best months,
 * signature experiences, places), its interface colours for Day and Night, and the
 * recipe for drawing its living landscape (sky, sun, terrain layers, weather and life).
 * Spec: docs/superpowers/specs/2026-10-17-seven-worlds-design.md §3.
 */

export type RegionKey = 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters';

/** Ridge shapes a land layer can take. */
export type Shape = 'mountains' | 'hills' | 'dunes' | 'plateau' | 'flat';

/** Details drawn on (or along) a land layer. */
export type Deco = 'pines' | 'canopy' | 'temples' | 'fort' | 'camels' | 'ruins' | 'boulders' | 'falls' | 'terraces' | 'palms';

/** Weather and life drawn over the landscape. */
export type Fx = 'birds' | 'kites' | 'boats' | 'houseboat' | 'stars' | 'snow' | 'rain' | 'fireflies' | 'diyas' | 'glitter';

/** A region's signature building or detail, standing on a land layer. */
export type LandmarkKind = 'shrine' | 'flags' | 'chhatri' | 'gopuram' | 'monastery' | 'lighthouse' | 'village';

/** One layer of the landscape, far to near. Positions are fractions of the screen height. */
export type Layer =
  | {
      kind: 'land';
      shape: Shape;
      /** Ridge baseline (0 = top, 1 = bottom of the screen) */
      base: number;
      /** Ridge height as a fraction of the screen height */
      amp: number;
      freq: number;
      seed: number;
      day: string;
      night: string;
      /** Parallax strength: 0 = still (far), ~0.4 = moves a lot (near) */
      depth: number;
      /** How far down snow reaches from the peaks (0–1) */
      snow?: number;
      /** Rounded (not jagged) mountains */
      round?: boolean;
      deco?: Deco;
      /** Signature landmarks on this ridge; `at` = fraction across the screen */
      landmarks?: { kind: LandmarkKind; at: number }[];
    }
  | { kind: 'mist'; y: number; day: string; night: string; alpha: number; speed: number }
  | { kind: 'water'; base: number; day: [string, string]; night: [string, string]; depth: number; sea?: boolean }
  | { kind: 'sand'; y: number };

export interface Region {
  key: RegionKey;
  name: string;
  /** Name in Hindi (Devanagari) */
  hi: string;
  /** Headline, plain part… */
  headline: string;
  /** …and the italic accent phrase that follows it */
  accent: string;
  lede: string;
  elev: string;
  terr: string;
  best: string;
  /** How good each month is to visit, January first: 1 = avoid, 2 = fine, 3 = best */
  months: number[];
  sig: [string, string, string];
  places: string[];
  /** Interface accents [accent, accent2] for Day and Night — each ≥ 4.5:1 on its glass (contrast.test.ts) */
  ui: { day: [string, string]; night: [string, string] };
  /** Sky gradient [top, horizon] for Day and Night */
  sky: { day: [string, string]; night: [string, string] };
  /** Sun / moon position as fractions of the screen [x, y] */
  sun: [number, number];
  layers: Layer[];
  fx: { day: Fx[]; night: Fx[] };
  /** Rough geographic centre [lat, lon] for "Use my location" */
  centre: [number, number];
  /** A real photograph of the region (self-hosted in /public/regions), with its credit */
  photo: RegionPhoto;
}

/** A real photo of a place in the region. Free licences (Wikimedia Commons) that require this credit. */
export interface RegionPhoto {
  src: string;
  /** Small square-ish crop for the region bar (/public/regions/thumb) */
  thumb: string;
  /** What and where it is — also the image's alt text */
  place: string;
  author: string;
  license: string;
  /** The photo's page on Wikimedia Commons */
  url: string;
}

export const REGIONS: Region[] = [
  {
    key: 'himalaya', name: 'Himalaya', hi: 'हिमालय', headline: 'Where the mountains', accent: 'keep time.',
    lede: 'Valleys of flowers, high passes and temple towns above the clouds — planned around altitude, weather and your pace.',
    elev: '1,800–5,600 m', terr: 'Peaks & valleys', best: 'May–Jun, Sep–Oct', months: [1, 1, 1, 2, 3, 3, 2, 2, 3, 3, 1, 1],
    sig: ['Char Dham — Badrinath & Mana', 'Valley of Flowers trek', 'Pangong Tso at first light'], places: ['Badrinath', 'Mana', 'Leh', 'Spiti', 'Rishikesh'],
    ui: { day: ['#2f6f9f', '#be513a'], night: ['#8fc1e3', '#e8b04b'] },
    sky: { day: ['#8fbfe2', '#e9f1f4'], night: ['#040a18', '#1c2b49'] }, sun: [0.52, 0.17], centre: [32, 78],
    photo: { src: '/regions/himalaya.jpg', thumb: '/regions/thumb/himalaya.jpg', place: 'Valley of Flowers, Uttarakhand', author: 'Rohit Sharma (edit: UnpetitproleX)', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Valley_of_flowers_national_park,_Uttarakhand,_India_03_(edit).jpg' },
    layers: [
      { kind: 'land', shape: 'mountains', base: 0.56, amp: 0.36, freq: 1.6, seed: 11, day: '#c9d7e3', night: '#3c4f6e', depth: 0.06, snow: 0.55 },
      { kind: 'mist', y: 0.5, day: '#ffffff', night: '#9fb3d1', alpha: 0.35, speed: 6 },
      { kind: 'land', shape: 'mountains', base: 0.66, amp: 0.3, freq: 2.2, seed: 23, day: '#8ea7bd', night: '#2b3d5a', depth: 0.14, snow: 0.35 },
      { kind: 'mist', y: 0.62, day: '#ffffff', night: '#8aa0c2', alpha: 0.3, speed: 10 },
      // A high meadow under the snow peaks, where the temple and prayer flags stand (clear of the page's panels)
      { kind: 'land', shape: 'hills', base: 0.66, amp: 0.05, freq: 1.1, seed: 29, day: '#7f9c8c', night: '#1d3038', depth: 0.18, landmarks: [{ kind: 'flags', at: 0.47 }, { kind: 'shrine', at: 0.535 }, { kind: 'village', at: 0.575 }] },
      { kind: 'land', shape: 'hills', base: 0.8, amp: 0.16, freq: 2.6, seed: 37, day: '#4c6e63', night: '#142630', depth: 0.26, deco: 'pines' },
      { kind: 'land', shape: 'hills', base: 0.93, amp: 0.1, freq: 3.2, seed: 41, day: '#2f4b42', night: '#0b171c', depth: 0.42, deco: 'pines' },
    ],
    fx: { day: ['birds'], night: ['stars', 'snow'] },
  },
  {
    key: 'thar', name: 'Thar', hi: 'थार', headline: 'Where the sand', accent: 'remembers kings.',
    lede: 'Golden forts, stepwells and desert camps under a sky full of stars — with the heat and the distances already worked out.',
    elev: '150–300 m', terr: 'Dunes & forts', best: 'Oct–Mar', months: [3, 3, 2, 1, 1, 1, 1, 1, 2, 3, 3, 3],
    sig: ['A night at a desert camp', 'Jaisalmer fort at golden hour', 'Camel trail at sunset'], places: ['Jaisalmer', 'Jodhpur', 'Bikaner', 'Pushkar', 'Barmer'],
    ui: { day: ['#b8562a', '#976e20'], night: ['#f08a5d', '#e9c060'] },
    sky: { day: ['#9cc4dc', '#f8e2c2'], night: ['#0a0920', '#33203f'] }, sun: [0.5, 0.2], centre: [26.8, 71.5],
    photo: { src: '/regions/thar.jpg', thumb: '/regions/thumb/thar.jpg', place: 'Sand dunes at sunset, Jaisalmer', author: 'Timothy A. Gonsalves', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Sunset_Sand_Dunes_Jaisalmer_Dec14_DSC_6540.jpg' },
    layers: [
      { kind: 'land', shape: 'dunes', base: 0.64, amp: 0.1, freq: 2.2, seed: 5, day: '#efcf9f', night: '#4b3756', depth: 0.05, deco: 'fort' },
      { kind: 'land', shape: 'dunes', base: 0.72, amp: 0.14, freq: 1.6, seed: 9, day: '#e2ad6c', night: '#3b2a47', depth: 0.14, landmarks: [{ kind: 'village', at: 0.44 }, { kind: 'chhatri', at: 0.5 }] },
      { kind: 'sand', y: 0.72 },
      { kind: 'land', shape: 'dunes', base: 0.84, amp: 0.16, freq: 1.2, seed: 15, day: '#cf8a48', night: '#2c1f37', depth: 0.26, deco: 'camels' },
      { kind: 'land', shape: 'dunes', base: 0.97, amp: 0.14, freq: 0.9, seed: 21, day: '#a8632f', night: '#1d1426', depth: 0.42 },
    ],
    fx: { day: ['birds'], night: ['stars'] },
  },
  {
    key: 'ganga', name: 'Gangetic Plains', hi: 'गंगा का मैदान', headline: 'Where the river', accent: 'remembers everything.',
    lede: 'Ghats at dawn, aarti at dusk and three thousand years of stories — Varanasi, Rishikesh, Prayagraj and beyond.',
    elev: '70–400 m', terr: 'River & ghats', best: 'Oct–Mar', months: [3, 3, 3, 1, 1, 1, 1, 1, 2, 3, 3, 3],
    sig: ['Ganga aarti at Dashashwamedh', 'Dawn boat past 80 ghats', 'Old-city food trail'], places: ['Varanasi', 'Rishikesh', 'Prayagraj', 'Bodh Gaya', 'Ayodhya'],
    ui: { day: ['#b4541c', '#8d6a12'], night: ['#f0a24b', '#ffd36b'] },
    sky: { day: ['#f1b98e', '#fbe6cd'], night: ['#0b0a1c', '#3d2440'] }, sun: [0.52, 0.42], centre: [25.5, 82],
    photo: { src: '/regions/ganga.jpg', thumb: '/regions/thumb/ganga.jpg', place: 'Boats at sunrise on the Ganga, Varanasi', author: 'Schwiki', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Boats_at_sunrise_Ganges_River_Varanasi_Uttar_Pradesh_Schwiki.jpg' },
    layers: [
      { kind: 'land', shape: 'flat', base: 0.69, amp: 0.03, freq: 2, seed: 3, day: '#cf9f80', night: '#2b1b2e', depth: 0.06, deco: 'temples' },
      { kind: 'water', base: 0.71, day: ['#f0c39a', '#b8805e'], night: ['#2a1a33', '#120c1c'], depth: 0.12 },
      { kind: 'mist', y: 0.69, day: '#fff3e2', night: '#5a3e66', alpha: 0.3, speed: 5 },
    ],
    fx: { day: ['kites', 'birds', 'boats'], night: ['stars', 'diyas', 'boats'] },
  },
  {
    key: 'deccan', name: 'Deccan Plateau', hi: 'दक्कन', headline: 'Where stone tells', accent: 'the oldest stories.',
    lede: 'Boulder-strewn kingdoms, rock-cut caves and fort cities — Hampi, Ajanta, Ellora and Hyderabad, routed through the heat.',
    elev: '300–900 m', terr: 'Plateau & ruins', best: 'Oct–Feb', months: [3, 3, 2, 1, 1, 1, 2, 2, 2, 3, 3, 3],
    sig: ['Hampi from Matanga Hill at sunrise', 'Ajanta & Ellora caves', 'Golconda fort by lantern'], places: ['Hampi', 'Ellora', 'Hyderabad', 'Bijapur', 'Badami'],
    ui: { day: ['#9a4f2c', '#4f7a8a'], night: ['#e8956a', '#8fc6d6'] },
    sky: { day: ['#a7c9dd', '#f3e5d2'], night: ['#060c1b', '#24263f'] }, sun: [0.53, 0.2], centre: [16.5, 76.5],
    photo: { src: '/regions/deccan.jpg', thumb: '/regions/thumb/deccan.jpg', place: 'Virupaksha temple complex, Hampi', author: 'iMahesh', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Complex_of_Virupaksha_Temple,_Hampi_(04).jpg' },
    layers: [
      { kind: 'land', shape: 'plateau', base: 0.62, amp: 0.14, freq: 1.4, seed: 7, day: '#d3b496', night: '#3a3552', depth: 0.05 },
      { kind: 'land', shape: 'plateau', base: 0.72, amp: 0.12, freq: 2, seed: 17, day: '#b58a66', night: '#2c2742', depth: 0.14, deco: 'ruins', landmarks: [{ kind: 'village', at: 0.42 }, { kind: 'gopuram', at: 0.5 }] },
      { kind: 'land', shape: 'hills', base: 0.86, amp: 0.1, freq: 2.4, seed: 27, day: '#8a6346', night: '#1f1b30', depth: 0.26, deco: 'boulders' },
      { kind: 'land', shape: 'hills', base: 0.97, amp: 0.07, freq: 3, seed: 31, day: '#5e4331', night: '#141122', depth: 0.42, deco: 'boulders' },
    ],
    fx: { day: ['birds'], night: ['stars', 'fireflies'] },
  },
  {
    key: 'ghats', name: 'Western Ghats', hi: 'सह्याद्रि', headline: 'Where the monsoon', accent: 'paints everything green.',
    lede: 'Rainforest ridges, roaring waterfalls and tea-and-coffee hills — Munnar, Coorg and the Sahyadri treks, timed with the rains.',
    elev: '600–2,600 m', terr: 'Rainforest & falls', best: 'Jun–Jan', months: [2, 2, 1, 1, 1, 3, 3, 3, 3, 3, 2, 2],
    sig: ['Monsoon waterfall treks', 'Munnar tea-estate mornings', 'Coorg coffee trails'], places: ['Munnar', 'Coorg', 'Matheran', 'Wayanad', 'Agumbe'],
    ui: { day: ['#2a7a4c', '#367a88'], night: ['#6fcf97', '#7fd3e0'] },
    sky: { day: ['#aebfbd', '#e2ebe6'], night: ['#06110e', '#1a2b27'] }, sun: [0.52, 0.15], centre: [11.5, 76.2],
    photo: { src: '/regions/ghats.jpg', thumb: '/regions/thumb/ghats.jpg', place: 'Lockhart tea estate, Munnar', author: 'Ingo Mehling', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Munnar_-_Lockhart_tea_plantation.jpg' },
    layers: [
      { kind: 'land', shape: 'mountains', base: 0.58, amp: 0.22, freq: 1.3, seed: 13, day: '#a8bdb0', night: '#22382f', depth: 0.05, round: true },
      { kind: 'mist', y: 0.52, day: '#ffffff', night: '#7f9a90', alpha: 0.45, speed: 7 },
      { kind: 'land', shape: 'mountains', base: 0.7, amp: 0.22, freq: 1.8, seed: 19, day: '#76a084', night: '#1a2e25', depth: 0.14, round: true, deco: 'falls' },
      { kind: 'mist', y: 0.66, day: '#ffffff', night: '#6d8a80', alpha: 0.4, speed: 11 },
      { kind: 'land', shape: 'hills', base: 0.84, amp: 0.12, freq: 2.6, seed: 29, day: '#3f7556', night: '#11221a', depth: 0.26, deco: 'canopy' },
      { kind: 'land', shape: 'hills', base: 0.96, amp: 0.09, freq: 3.4, seed: 33, day: '#285a3d', night: '#0a1610', depth: 0.42, deco: 'canopy' },
    ],
    fx: { day: ['rain', 'birds'], night: ['rain', 'fireflies'] },
  },
  {
    key: 'konkan', name: 'Konkan & Malabar', hi: 'कोंकण–मालाबार', headline: 'Where the sun', accent: 'clocks out late.',
    lede: 'Beach mornings, sea forts, backwaters and fish thalis — the quiet coves and the best sunsets, sorted.',
    elev: 'Sea level', terr: 'Coast & backwaters', best: 'Nov–Mar', months: [3, 3, 3, 2, 1, 1, 1, 1, 2, 2, 3, 3],
    sig: ['A night on a backwater houseboat', 'Sunset from a sea fort', 'Fish-thali crawl along the coast'], places: ['Goa', 'Gokarna', 'Alleppey', 'Varkala', 'Malvan'],
    ui: { day: ['#c34d34', '#1f7a8c'], night: ['#ff8a6b', '#4fc3d4'] },
    sky: { day: ['#7ec6dd', '#fde0c6'], night: ['#061325', '#22325a'] }, sun: [0.52, 0.3], centre: [15, 74.2],
    photo: { src: '/regions/konkan.jpg', thumb: '/regions/thumb/konkan.jpg', place: 'Houseboats on the Kerala backwaters', author: 'Vyacheslav Argenberg', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Kerala_backwaters,_Houseboats,_India.jpg' },
    layers: [
      { kind: 'land', shape: 'hills', base: 0.6, amp: 0.08, freq: 1.4, seed: 2, day: '#7fa597', night: '#1d2c40', depth: 0.05, landmarks: [{ kind: 'lighthouse', at: 0.46 }] },
      { kind: 'water', base: 0.6, day: ['#3fb3c4', '#0f6f86'], night: ['#123050', '#06121f'], depth: 0.12, sea: true },
      { kind: 'land', shape: 'flat', base: 0.9, amp: 0.02, freq: 2, seed: 8, day: '#f2d8ae', night: '#2a3346', depth: 0.3 },
      { kind: 'land', shape: 'flat', base: 1.08, amp: 0, freq: 1, seed: 1, day: '#e8c894', night: '#1f2738', depth: 0.42, deco: 'palms' },
    ],
    fx: { day: ['birds', 'glitter', 'houseboat'], night: ['stars', 'glitter', 'houseboat'] },
  },
  {
    key: 'sisters', name: 'Seven Sisters', hi: 'सात बहनें', headline: 'Where the clouds', accent: 'come to rest.',
    lede: 'Living root bridges, monasteries and tea gardens rolling into the mist — permits, seasons and road times handled for you.',
    elev: '100–4,000 m', terr: 'Cloud forest & tea', best: 'Oct–Apr', months: [3, 3, 3, 3, 2, 1, 1, 1, 2, 3, 3, 3],
    sig: ['Double-decker living root bridge', 'Tawang monastery in the clouds', 'Kaziranga rhino safari'], places: ['Shillong', 'Cherrapunji', 'Tawang', 'Ziro', 'Majuli'],
    ui: { day: ['#4f7a34', '#b23a48'], night: ['#9bd06c', '#ef6f7c'] },
    sky: { day: ['#c4d4d2', '#eef0e8'], night: ['#040b0a', '#162420'] }, sun: [0.5, 0.17], centre: [26, 92.5],
    photo: { src: '/regions/sisters.jpg', thumb: '/regions/thumb/sisters.jpg', place: 'Double-decker living root bridge, Meghalaya', author: 'Chiranjeeb Baul', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Double_decker_living_root_bridge_02.jpg' },
    layers: [
      { kind: 'land', shape: 'hills', base: 0.6, amp: 0.16, freq: 1.1, seed: 4, day: '#b4c6bd', night: '#1d2e2a', depth: 0.05 },
      { kind: 'mist', y: 0.55, day: '#ffffff', night: '#7d948d', alpha: 0.5, speed: 5 },
      { kind: 'land', shape: 'hills', base: 0.72, amp: 0.16, freq: 1.6, seed: 14, day: '#86a991', night: '#16251f', depth: 0.14, deco: 'terraces', landmarks: [{ kind: 'monastery', at: 0.52 }, { kind: 'flags', at: 0.44 }] },
      { kind: 'mist', y: 0.68, day: '#ffffff', night: '#6c8279', alpha: 0.42, speed: 8 },
      { kind: 'land', shape: 'hills', base: 0.86, amp: 0.14, freq: 2.2, seed: 24, day: '#55835f', night: '#0f1c16', depth: 0.26, deco: 'terraces' },
      { kind: 'land', shape: 'hills', base: 0.98, amp: 0.1, freq: 3, seed: 34, day: '#335c3f', night: '#09130e', depth: 0.42, deco: 'canopy' },
    ],
    fx: { day: ['birds'], night: ['fireflies', 'stars'] },
  },
];

/** Look a region up by key (undefined for unknown keys, e.g. a stale saved value). */
export function regionByKey(key: string): Region | undefined {
  return REGIONS.find((r) => r.key === key);
}
