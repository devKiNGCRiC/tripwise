/**
 * noise.ts — tiny maths helpers for drawing landscapes:
 * a seeded random generator, smooth 1-D fractal noise for ridgelines, colour mixing.
 * Seeded so every region always looks the same (no flicker between visits).
 */

/** Seeded pseudo-random numbers in [0, 1) (a small LCG — plenty for scenery). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Linear interpolation from a to b. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Clamp v into [min, max]. */
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Smooth 0→1 step between edges a and b (like GLSL smoothstep). */
export function smoothstep(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Smooth 1-D value noise in about [-1, 1], seeded. */
function noise1(seed: number) {
  const random = rng(seed);
  const table = Array.from({ length: 512 }, random);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(table[i & 511], table[(i + 1) & 511], u) * 2 - 1;
  };
}

/** Fractal noise (five octaves of noise1) — natural-looking ridgelines. */
export function fbm1(seed: number): (x: number) => number {
  const n = noise1(seed);
  return (x) => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    for (let k = 0; k < 5; k++) {
      sum += amp * n(x * freq);
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
}

/** "#rrggbb" → [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** Mix two "#rrggbb" colours (t = 0 → a, 1 → b), optionally with alpha; returns a CSS colour. */
export function mixHex(a: string, b: string, t: number, alpha = 1): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const [r, g, bl] = A.map((v, i) => Math.round(lerp(v, B[i], t)));
  return alpha === 1 ? `rgb(${r},${g},${bl})` : `rgba(${r},${g},${bl},${alpha})`;
}
