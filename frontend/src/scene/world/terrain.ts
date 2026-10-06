/**
 * terrain.ts — the shape of the TripWise world, as pure maths.
 *
 * One heightfield holds everything: a river winding along −z through a deep
 * valley, huge snowy ranges near the start that soften into hills, a ring of
 * giant peaks on the horizon (so you never see the world's edge), a rock shelf
 * for the waterfall, and patchwork farmland at the end.
 *
 * No Three.js here on purpose: this runs inside a Web Worker (terrain.worker.ts)
 * so building ~200k vertices never freezes the page. Deterministic: same world every visit.
 */
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const perlin = new ImprovedNoise();

/** Side length of the square world (m) and where its centre sits along z. */
export const WORLD = { size: 16000, centerZ: -3000 } as const;

/** Smooth 0→1 ramp between a and b (works with a > b too). */
export function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Fractal noise: soft rolling detail. Roughly −1…1. */
function fbm(x: number, z: number): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < 5; i++) {
    sum += amp * perlin.noise(x * freq, z * freq, 1.7);
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return sum / norm;
}

/** Ridged noise: sharp mountain crests. 0…1. */
function ridged(x: number, z: number): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < 6; i++) {
    let v = 1 - Math.abs(perlin.noise(x * freq, z * freq, 4.1));
    v *= v;
    sum += amp * v;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}

/** The river's centre line (x) at a given z — a lazy double meander. */
export function riverX(z: number): number {
  return 140 * Math.sin(z * 0.0016) + 60 * Math.sin(z * 0.0041);
}

/** The waterfall's rock shelf, right beside the river. */
export const CLIFF = { z: -1700, top: 300, x: riverX(-1700) + 150 } as const;

/** How tall the valley walls get at z: huge near the start, hills by the end. */
function peak(z: number): number {
  if (z > -900) return 1700;
  if (z > -2500) return lerp(1700, 260, (-900 - z) / 1600);
  return lerp(260, 70, Math.min(1, (-2500 - z) / 700));
}

/** Ground height (m) at any point. Water level is y = 0. */
export function height(x: number, z: number): number {
  const d = Math.abs(x - riverX(z));
  const valley = smooth(60, 1100, d);
  // Valley walls
  let h = 4 + valley * valley * Math.pow(ridged(x * 0.0009, z * 0.0009), 1.35) * peak(z) + fbm(x * 0.012, z * 0.012) * 5;
  // Giant ranges far from the river: the horizon is always mountains
  h += smooth(1400, 3200, d) * Math.pow(ridged(x * 0.0005 + 7, z * 0.0005), 1.2) * 2600;
  // Waterfall shelf: steep face toward the river, short ramp back into the wall
  const along = (x - CLIFF.x) / 420;
  const across = (z - CLIFF.z + 70) / 120;
  const cr = (along < 0 ? (along * 3.2) ** 2 : 0) + across ** 2;
  if (cr < 1.4 && along < 0.7) {
    h = Math.max(h, (CLIFF.top + Math.max(0, along) * 140) * smooth(1.4, 0.85, cr) * smooth(0.7, 0.45, along) + fbm(x * 0.04, z * 0.04) * 22);
  }
  // Riverbed under the water
  if (d < 60) h = lerp(-10, h, smooth(14, 60, d));
  // Farmland at the end of the valley (valley floor only)
  const fields = smooth(-2600, -3000, z) * (1 - smooth(500, 1300, d));
  if (fields > 0 && d > 60) h = lerp(h, 4 + fbm(x * 0.004, z * 0.004) * 8, fields);
  return h;
}

/* Palette for the ground (linear-ish RGB 0–1). */
const SNOW = [0.957, 0.973, 1], ROCK = [0.478, 0.443, 0.4], MOSS = [0.365, 0.416, 0.322], GRASS = [0.31, 0.49, 0.227];
const FOREST = [0.184, 0.322, 0.161], MEADOW = [0.478, 0.639, 0.29], GOLD = [0.788, 0.635, 0.29], SAND = [0.608, 0.541, 0.416];
const mix = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export interface TerrainData {
  positions: Float32Array;
  normals: Float32Array;
  /** Base colour per vertex (palette). */
  colors: Float32Array;
  /** Texture blend per vertex: grass, rock, snow. */
  weights: Float32Array;
  indices: Uint32Array;
}

/** Build the whole terrain mesh as plain arrays (seg × seg quads). */
export function buildTerrain(seg: number): TerrainData {
  const n = seg + 1, count = n * n, step = WORLD.size / seg, half = WORLD.size / 2;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const weights = new Float32Array(count * 3);
  const heights = new Float32Array(count);

  // 1. Heights on a regular grid
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const i = row * n + col, x = -half + col * step, z = WORLD.centerZ - half + row * step;
      const y = height(x, z);
      heights[i] = y;
      positions.set([x, y, z], i * 3);
    }
  }

  // 2. Normals from neighbouring heights (central differences — no Three.js needed)
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const i = row * n + col;
      const hl = heights[row * n + Math.max(0, col - 1)], hr = heights[row * n + Math.min(n - 1, col + 1)];
      const hd = heights[Math.max(0, row - 1) * n + col], hu = heights[Math.min(n - 1, row + 1) * n + col];
      const nx = hl - hr, nz = hd - hu, ny = 2 * step;
      const len = Math.hypot(nx, ny, nz);
      normals.set([nx / len, ny / len, nz / len], i * 3);
    }
  }

  // 3. Colour + texture weights from height, steepness and place
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2], up = normals[i * 3 + 1];
    const noise = fbm(x * 0.01, z * 0.01);
    const snowLine = 720 + noise * 160;
    let c: number[];
    if (y < 2) c = SAND;
    else if (y > snowLine && up > 0.5) c = mix(SNOW, ROCK, (1 - up) * 0.5);
    else if (up < 0.72) c = mix(ROCK, MOSS, Math.abs(noise));
    else if (y > 260) c = mix(ROCK, GRASS, 0.4);
    else c = mix(FOREST, MEADOW, smooth(-0.3, 0.6, noise) * (1 - y / 260));
    const fields = smooth(-2600, -2950, z) * (1 - smooth(500, 1300, Math.abs(x - riverX(z))));
    if (fields > 0 && y > 1 && up > 0.85) {
      // Patchwork farmland: each ~70 m plot gets its own crop colour
      const plot = perlin.noise(Math.floor(x / 70) * 0.37, Math.floor(z / 55) * 0.41, 9.3);
      const crop = plot > 0.15 ? GOLD : plot > -0.15 ? MEADOW : GRASS;
      c = mix(c, crop, fields * 0.85);
    }
    colors.set(c, i * 3);

    const snowW = smooth(snowLine - 60, snowLine + 40, y) * smooth(0.4, 0.6, up);
    const rockW = (1 - snowW) * Math.max(smooth(0.82, 0.62, up), smooth(220, 420, y) * 0.7);
    weights.set([Math.max(0, 1 - snowW - rockW), rockW, snowW], i * 3);
  }

  // 4. Two triangles per grid square
  const indices = new Uint32Array(seg * seg * 6);
  let k = 0;
  for (let row = 0; row < seg; row++) {
    for (let col = 0; col < seg; col++) {
      const a = row * n + col, b = a + 1, c = a + n, d = c + 1;
      indices.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  return { positions, normals, colors, weights, indices };
}

/** Small seeded random generator, so forests grow the same way every visit. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scatter pines on dry, gentle, low slopes. Per tree: x, y, z, scale, heightScale, rotation. */
export function placeTrees(target: number): { data: Float32Array; count: number } {
  const random = seeded(42);
  const data = new Float32Array(target * 6);
  let count = 0;
  for (let tries = 0; count < target && tries < target * 12; tries++) {
    const x = (random() - 0.5) * 3200, z = -random() * 3000 + 100, y = height(x, z);
    const slope = Math.abs(height(x + 6, z) - y) + Math.abs(height(x, z + 6) - y);
    if (y < 8 || y > 300 || slope > 9 || z < -2700) continue;
    const scale = 0.7 + random() * 0.9;
    data.set([x, y - 1, z, scale, scale * (0.8 + random() * 0.6), random() * Math.PI * 2], count * 6);
    count++;
  }
  return { data, count };
}
