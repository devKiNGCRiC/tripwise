/**
 * terrain.worker.ts — builds the terrain mesh data and the forest layout on a
 * background thread, so the page stays smooth while ~150k vertices are computed.
 * The finished arrays are *transferred* (not copied) back to the main thread.
 */
import { buildTerrain, placeTrees } from './terrain';

export interface TerrainRequest {
  seg: number;
  trees: number;
}

self.onmessage = (event: MessageEvent<TerrainRequest>) => {
  const terrain = buildTerrain(event.data.seg);
  const forest = placeTrees(event.data.trees);
  const transfer = [terrain.positions.buffer, terrain.normals.buffer, terrain.colors.buffer, terrain.weights.buffer, terrain.indices.buffer, forest.data.buffer];
  (self as unknown as Worker).postMessage({ terrain, forest }, transfer);
};
