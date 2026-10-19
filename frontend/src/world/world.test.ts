/**
 * world.test.ts — the living-world engine without a browser:
 * the seven regions' data, nearest-region lookup (also far outside India),
 * photo palettes from raw pixels (also odd photos), and that every scene
 * draws in Day and Night without throwing.
 */
import { describe, expect, it } from 'vitest';
import { nearestRegion } from './geo';
import { paletteFromPixels } from './palette';
import { REGIONS, regionByKey } from './regions';
import { Scene } from './scene';

/** RGBA pixels: half warm orange, half teal (a sunset over the sea). */
function orangeAndTeal() {
  const px: number[] = [];
  for (let i = 0; i < 400; i++) px.push(...(i < 220 ? [230, 120, 40, 255] : [20, 140, 150, 255]));
  return px;
}
/** RGBA pixels: one flat grey (no colour at all). */
function allGrey() {
  return Array.from({ length: 300 }, () => [128, 128, 128, 255]).flat();
}

/** A canvas context that records nothing: every method is a no-op. */
function stubContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop() {} };
  return new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      return () => undefined;
    },
    set: () => true,
  });
}

describe('regions', () => {
  it('has seven regions in landscape order, each with 12 month scores and 3 signature experiences', () => {
    expect(REGIONS.map((r) => r.key)).toEqual(['himalaya', 'thar', 'ganga', 'deccan', 'ghats', 'konkan', 'sisters']);
    REGIONS.forEach((r) => {
      expect(r.months).toHaveLength(12);
      expect(r.sig).toHaveLength(3);
      expect(r.places.length).toBeGreaterThanOrEqual(4);
    });
    expect(regionByKey('ganga')?.name).toBe('Gangetic Plains');
    expect(regionByKey('mars')).toBeUndefined();
  });
});

describe('nearestRegion', () => {
  it('finds the region around a place', () => {
    expect(nearestRegion(30.74, 79.49)).toBe('himalaya'); // Badrinath
    expect(nearestRegion(26.91, 70.92)).toBe('thar'); // Jaisalmer
    expect(nearestRegion(25.32, 82.97)).toBe('ganga'); // Varanasi
    expect(nearestRegion(15.33, 76.46)).toBe('deccan'); // Hampi
    expect(nearestRegion(15.5, 73.83)).toBe('konkan'); // Goa
    expect(nearestRegion(25.57, 91.88)).toBe('sisters'); // Shillong
  });

  it('still answers for places far outside India', () => {
    expect(REGIONS.map((r) => r.key)).toContain(nearestRegion(51.5, -0.12)); // London
  });
});

describe('paletteFromPixels', () => {
  const hexRe = /^#[0-9a-f]{6}$/;

  it('returns valid colours for normal and odd photos', () => {
    for (const px of [orangeAndTeal(), allGrey(), [10, 20, 30, 255]]) {
      const p = paletteFromPixels(px);
      [p.tint, ...p.swatches, ...p.accents.day, ...p.accents.night].forEach((c) => expect(c).toMatch(hexRe));
    }
  });

  it('takes its accent from the colourful part of the photo', () => {
    expect(paletteFromPixels(orangeAndTeal()).accents.day[0]).not.toBe(paletteFromPixels(allGrey()).accents.day[0]);
  });

  it("tints from the photo's colour, not its grey sky", () => {
    // 60% hazy sky, 30% green palms, 10% shadow.
    const { tint } = paletteFromPixels(mix([[170, 180, 190], 60], [[60, 140, 50], 30], [[20, 20, 20], 10]));
    const [r, g, b] = rgb(tint);
    expect(g).toBeGreaterThan(r + 30);
    expect(g).toBeGreaterThan(b + 30);
  });

  it('never tints the world black from a dark photo (a sunset: dark water, golden sky)', () => {
    const { tint } = paletteFromPixels(mix([[10, 11, 12], 70], [[200, 140, 60], 30]));
    const [r, g, b] = rgb(tint);
    expect(Math.max(r, g, b)).toBeGreaterThan(110);
    expect(r).toBeGreaterThan(b + 50);
  });

  it('gives two different accents when the photo has two colours', () => {
    const { day } = paletteFromPixels(orangeAndTeal()).accents;
    expect(hueGap(hue(day[0]), hue(day[1]))).toBeGreaterThan(60);
  });

  it('keeps a grey photo neutral', () => {
    const [r, g, b] = rgb(paletteFromPixels(allGrey()).tint);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(10);
  });
});

/** RGBA pixels from [colour, how many] parts. */
function mix(...parts: [[number, number, number], number][]) {
  return parts.flatMap(([[r, g, b], n]) => Array.from({ length: n * 4 }, () => [r, g, b, 255]).flat());
}
/** "#rrggbb" → [r, g, b]. */
function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
/** Hue of "#rrggbb" in degrees. */
function hue(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
/** Distance between two hues around the colour wheel. */
function hueGap(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

describe('Scene', () => {
  it('draws every region by day and by night without throwing', () => {
    const ctx = stubContext();
    for (const region of REGIONS) {
      const scene = new Scene(region);
      expect(() => scene.draw(ctx, 800, 600, 3, 0, 0, 0, 0)).not.toThrow();
      expect(() => scene.draw(ctx, 800, 600, 3, 1, 0.2, -0.2, 300, 0.5)).not.toThrow();
    }
  });
});
