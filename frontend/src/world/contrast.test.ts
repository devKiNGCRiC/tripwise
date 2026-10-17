/**
 * contrast.test.ts — interface accents stay readable: every region's accents (used for
 * text, focus rings and filled buttons) reach WCAG AA 4.5:1 on the light glass by day and
 * on the dark glass by night, and so do accents read from any photo — even a white one.
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { paletteFromPixels } from './palette';
import { REGIONS } from './regions';

/** What the glass looks like behind text: near-white by day, deep indigo by night. */
const DAY_BG = '#ffffff';
const NIGHT_BG = '#0b1020';

describe('accent contrast', () => {
  it('every region accent reads at 4.5:1 or better', () => {
    for (const region of REGIONS) {
      for (const colour of region.ui.day) expect(contrastRatio(colour, DAY_BG), `${region.key} day ${colour}`).toBeGreaterThanOrEqual(4.5);
      for (const colour of region.ui.night) expect(contrastRatio(colour, NIGHT_BG), `${region.key} night ${colour}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('photo accents read at 4.5:1 or better, even from a snow-white or a pitch-dark photo', () => {
    const flat = (r: number, g: number, b: number) => Array.from({ length: 200 }, () => [r, g, b, 255]).flat();
    for (const px of [flat(245, 245, 245), flat(8, 8, 10), flat(230, 210, 60)]) {
      const p = paletteFromPixels(px);
      for (const colour of p.accents.day) expect(contrastRatio(colour, DAY_BG)).toBeGreaterThanOrEqual(4.5);
      for (const colour of p.accents.night) expect(contrastRatio(colour, NIGHT_BG)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
