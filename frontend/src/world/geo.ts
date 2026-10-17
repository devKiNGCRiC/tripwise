/**
 * geo.ts — "Use my location": which of the seven worlds is closest to a point.
 * A plain distance in degrees to each region's rough centre is enough at this scale,
 * and it always answers — even for places far outside India.
 */
import { REGIONS, type RegionKey } from './regions';

/** Nearest region to latitude/longitude (degrees north/east). */
export function nearestRegion(lat: number, lon: number): RegionKey {
  let best = REGIONS[0];
  let bestDistance = Infinity;
  for (const region of REGIONS) {
    const [rLat, rLon] = region.centre;
    const distance = (rLat - lat) ** 2 + (rLon - lon) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = region;
    }
  }
  return best.key;
}
