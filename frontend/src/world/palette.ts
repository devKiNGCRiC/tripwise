/**
 * palette.ts — "Your colours": read a trip photo's colours from its pixels.
 *
 * Works on raw RGBA data (the caller draws the photo into a small canvas on the device —
 * nothing is uploaded). Colours are grouped into coarse buckets; the most common becomes
 * the tint that recolours the living world, the most vivid become the interface accents.
 * Grey, tiny or odd photos still produce a complete, valid palette.
 */

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
  // 2. Average each bucket and work out how colourful / light it is; most common first.
  const colours: Bucket[] = [...buckets.values()]
    .map(([r, g, b, count]) => {
      const [R, G, B] = [r / count, g / count, b / count];
      const max = Math.max(R, G, B);
      const min = Math.min(R, G, B);
      return { r: R, g: G, b: B, count, s: max ? (max - min) / max : 0, l: (max + min) / 510 };
    })
    .sort((a, b) => b.count - a.count);
  // 3. Pick the dominant colour and two vivid accents (falling back gracefully).
  const dominant = colours[0] ?? GREY;
  const vivid = colours.filter((c) => c.s > 0.3 && c.l > 0.2 && c.l < 0.75).sort((a, b) => b.s * Math.sqrt(b.count) - a.s * Math.sqrt(a.count));
  const accent = vivid[0] ?? colours[1] ?? dominant;
  const accent2 = vivid[1] ?? colours[2] ?? accent;

  return {
    tint: toHex(dominant),
    swatches: [toHex(dominant), toHex(accent), toHex(accent2), toHex(dominant, 0, 0.3)],
    accents: {
      day: [toHex(accent, 0, 0.8), toHex(accent2, 0, 0.85)],
      night: [toHex(accent, 0.35), toHex(accent2, 0.35)],
    },
  };
}
