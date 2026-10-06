/**
 * terrainJob.ts — starts building the terrain in a Web Worker as EARLY as possible.
 *
 * Scenery calls `startTerrainJob()` the moment it decides to use 3D, so the
 * terrain computes while the browser is still downloading the 3D code chunk.
 * createWorld() later awaits the same promise (no second build). Tiny on purpose:
 * it lives in the main bundle and must not pull in Three.js.
 */
import type { SceneTier } from '../quality';
import type { TerrainData } from './terrain';

export interface BuiltTerrain {
  terrain: TerrainData;
  forest: { data: Float32Array; count: number };
}

/** Grid resolution and forest size per detail tier. */
export const TERRAIN_DETAIL = {
  high: { seg: 340, trees: 5200 },
  low: { seg: 200, trees: 2200 },
} as const;

const jobs = new Map<SceneTier, Promise<BuiltTerrain>>();

export function startTerrainJob(tier: SceneTier): Promise<BuiltTerrain> {
  const existing = jobs.get(tier);
  if (existing) return existing;
  const job = new Promise<BuiltTerrain>((resolve, reject) => {
    const worker = new Worker(new URL('./terrain.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<BuiltTerrain>) => {
      resolve(event.data);
      worker.terminate();
    };
    worker.onerror = (error) => {
      jobs.delete(tier); // allow a retry later
      reject(error);
      worker.terminate();
    };
    worker.postMessage(TERRAIN_DETAIL[tier]);
  });
  jobs.set(tier, job);
  return job;
}
