/**
 * contrast.ts — keep coloured text readable (WCAG 2 contrast).
 *   contrastRatio(a, b)        → 1–21, how far apart two "#rrggbb" colours are in brightness
 *   ensureContrast(c, bg, min) → c, nudged darker (on light backgrounds) or lighter (on dark
 *                                ones) just until it reaches `min` against `bg`
 * Used so colours read from a traveller's photo always stay legible as accents.
 */
import { hexToRgb } from './noise';

/** Relative luminance of a "#rrggbb" colour (0 = black, 1 = white). */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Two-digit hex for a 0–255 value. */
const hex2 = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');

/** Step `colour` toward black (light bg) or white (dark bg) until it reaches `min` contrast. */
export function ensureContrast(colour: string, background: string, min = 4.5): string {
  const towardWhite = luminance(background) < 0.5;
  const [r, g, b] = hexToRgb(colour);
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const mix = (v: number) => (towardWhite ? v + (255 - v) * t : v * (1 - t));
    const candidate = `#${hex2(mix(r))}${hex2(mix(g))}${hex2(mix(b))}`;
    if (contrastRatio(candidate, background) >= min) return candidate;
  }
  return towardWhite ? '#ffffff' : '#000000';
}
