/**
 * terrain.test.ts — the landscape's shape rules: river below the waterline,
 * giant ranges on the horizon, flat farmland at the end, a waterfall cliff,
 * and the generated mesh data having the right sizes.
 */
import { describe, expect, it } from 'vitest';
import { buildTerrain, CLIFF, height, placeTrees, riverX } from './terrain';

describe('terrain shape', () => {
  it('carves the riverbed below the water (y = 0)', () => {
    for (const z of [0, -800, -1600, -2400, -3100]) {
      expect(height(riverX(z), z)).toBeLessThan(0);
    }
  });

  it('rings the world with high mountains far from the river', () => {
    const far = [-500, -1500, -2500].map((z) => height(riverX(z) + 2800, z));
    expect(Math.max(...far)).toBeGreaterThan(500);
  });

  it('flattens into low farmland near the end of the valley', () => {
    for (const offset of [200, 300, 400]) {
      const h = height(riverX(-3150) + offset, -3150);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThan(40);
    }
  });

  it('builds a tall shelf beside the river for the waterfall', () => {
    expect(height(CLIFF.x - 30, CLIFF.z - 70)).toBeGreaterThan(CLIFF.top * 0.8);
  });
});

describe('buildTerrain', () => {
  it('returns positions, normals, colours and texture weights for every vertex', () => {
    const seg = 16;
    const data = buildTerrain(seg);
    const vertices = (seg + 1) * (seg + 1);
    expect(data.positions).toHaveLength(vertices * 3);
    expect(data.normals).toHaveLength(vertices * 3);
    expect(data.colors).toHaveLength(vertices * 3);
    expect(data.weights).toHaveLength(vertices * 3);
    expect(data.indices.length).toBe(seg * seg * 6);
  });

  it('produces unit-length normals', () => {
    const { normals } = buildTerrain(8);
    for (let i = 0; i < normals.length; i += 3) {
      expect(Math.hypot(normals[i], normals[i + 1], normals[i + 2])).toBeCloseTo(1, 4);
    }
  });
});

describe('placeTrees', () => {
  it('places trees only on dry, gentle, low ground', () => {
    const trees = placeTrees(200);
    expect(trees.count).toBeGreaterThan(50);
    for (let i = 0; i < trees.count; i++) {
      const x = trees.data[i * 6], y = trees.data[i * 6 + 1], z = trees.data[i * 6 + 2];
      expect(y).toBeGreaterThan(6);
      expect(y).toBeLessThan(320);
      expect(Math.abs(height(x, z) - (y + 1))).toBeLessThan(0.01);
    }
  });
});
