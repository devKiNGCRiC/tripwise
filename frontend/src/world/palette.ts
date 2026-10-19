/**
 * palette.ts — "Your colours": read a trip photo's colours from its pixels.
 *
 * Works on raw RGBA data (the caller draws the photo into a small canvas on the device —
 * nothing is uploaded). Colours are grouped into coarse buckets and scored by how much
 * of the photo they cover AND how colourful they are, so hazy sky, shadow and haze don't
 * win just by being common: the best one becomes the tint that recolours the living
 * world, and the best two of clearly different hues become the interface accents. The
 * tint keeps the photo's own hue but is lifted out of the dark and the dull, so a sunset
 * over dark water tints the world gold, never black. Grey, tiny or odd photos still
 * produce a complete, valid palette (a grey photo stays neutral), and accents are always
 * nudged to stay readable (4.5:1) on the light Day glass and the dark Night glass.
 */
import { ensureContrast } from './contrast';

/** What the glass looks like behind text by Day and by Night. */
const DAY_GLASS = '#ffffff';
const NIGHT_GLASS = '#0b1020';

export interface Palette {
  /** Dominant colour, blended over the landscape */
  tint: string;
  /** Four swatches to show the traveller: dominant, accent, second accent, deep shade */
  swatches: [string, string, string, string];
  /** Interface accents [accent, accent2] for Day (deeper) and Night (lighter) */
  accents: { day: [string, string]; night: [string, string] };
}

/** One averaged colour bucket. */
interface Bucket {
  r: number;
  g: number;
  b: number;
  count: number;
  /** Saturation and lightness, 0–1 */
  s: number;
  l: number;
}

/** Number → two-digit hex. */
const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
/** Bucket → "#rrggbb", optionally mixed toward white (lighten > 0) or scaled darker (darken < 1). */
function toHex({ r, g, b }: Pick<Bucket, 'r' | 'g' | 'b'>, lighten = 0, darken = 1) {
  const mix = (v: number) => (v + (255 - v) * lighten) * darken;
  return `#${hex2(mix(r))}${hex2(mix(g))}${hex2(mix(b))}`;
}

/** Fallback when a photo has no usable pixels at all. */
const GREY: Bucket = { r: 128, g: 128, b: 128, count: 1, s: 0, l: 0.5 };

/** Hue of a colour in degrees (0–360). */
function hueOf({ r, g, b }: Pick<Bucket, 'r' | 'g' | 'b'>) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
/** Distance between two hues around the colour wheel (0–180). */
function hueGap(a: Bucket, b: Bucket) {
  const d = Math.abs(hueOf(a) - hueOf(b));
  return d > 180 ? 360 - d : d;
}

/** HSL (h 0–360, s and l 0–1) → a bucket-like colour. */
function fromHsl(h: number, s: number, l: number): Pick<Bucket, 'r' | 'g' | 'b'> {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** The same hue, lifted to a usable brightness and gently enriched (greys stay grey). */
function lift(colour: Bucket, minL: number, maxL: number) {
  if (colour.s < 0.08) {
    // Neutral: keep it grey, just at a usable brightness.
    const v = Math.max(minL, Math.min(maxL, colour.l)) * 255;
    return { r: v, g: v, b: v };
  }
  return fromHsl(hueOf(colour), Math.min(0.75, Math.max(colour.s * 1.15, 0.38)), Math.max(minL, Math.min(maxL, colour.l)));
}

/** Build a palette from RGBA pixel data (any length that's a multiple of 4). */
export function paletteFromPixels(data: ArrayLike<number>): Palette {
  // 1. Group pixels into 8×8×8 colour buckets, skipping see-through pixels.
  const buckets = new Map<number, [number, number, number, number]>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
    const sum = buckets.get(key) ?? [0, 0, 0, 0];
    sum[0] += data[i];
    sum[1] += data[i + 1];
    sum[2] += data[i + 2];
    sum[3]++;
    buckets.set(key, sum);
  }
  // 2. Average each bucket and work out its HSL saturation and lightness; most common first.
  const colours: Bucket[] = [...buckets.values()]
    .map(([r, g, b, count]) => {
      const [R, G, B] = [r / count, g / count, b / count];
      const max = Math.max(R, G, B) / 255;
      const min = Math.min(R, G, B) / 255;
      const l = (max + min) / 2;
      const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
      return { r: R, g: G, b: B, count, s, l };
    })
    .sort((a, b) => b.count - a.count);

  // 3. Score the colourful ones by coverage × colourfulness (so a big grey sky or a
  //    black shadow can't win just by being common).
  const score = (c: Bucket) => c.count * c.s * c.s;
  const colourful = colours.filter((c) => c.s > 0.18 && c.l > 0.12 && c.l < 0.88).sort((a, b) => score(b) - score(a));
  const dominant = colourful[0] ?? colours[0] ?? GREY;
  // Accents: the best colourful one, then the best of a clearly different hue.
  const accent = colourful[0] ?? colours[1] ?? dominant;
  const accent2 = colourful.find((c) => hueGap(c, accent) > 40) ?? colourful[1] ?? colours[2] ?? accent;

  // 4. Lift each to a usable brightness (the tint is mid-tone, never black or white).
  const tint = lift(dominant, 0.38, 0.62);
  const a1 = lift(accent, 0.3, 0.6);
  const a2 = lift(accent2, 0.3, 0.6);

  return {
    tint: toHex(tint),
    swatches: [toHex(tint), toHex(a1), toHex(a2), toHex(tint, 0, 0.3)],
    accents: {
      day: [ensureContrast(toHex(a1, 0, 0.8), DAY_GLASS), ensureContrast(toHex(a2, 0, 0.85), DAY_GLASS)],
      night: [ensureContrast(toHex(a1, 0.35), NIGHT_GLASS), ensureContrast(toHex(a2, 0.35), NIGHT_GLASS)],
    },
  };
}
