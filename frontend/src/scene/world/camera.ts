/**
 * camera.ts — the flight path of the descent.
 *
 * Two smooth curves through the world: where the camera IS, and where it LOOKS.
 * Scroll progress 0 → 1 slides along both: from above the clouds, down the
 * glacier valley, past the mountains, straight at the waterfall, low over the
 * river, and out over the fields.
 */
import { CatmullRomCurve3, Vector3 } from 'three';
import { CLIFF, riverX } from './terrain';

const rx = riverX;

const positionPath = new CatmullRomCurve3([
  new Vector3(0, 2700, 1300),
  new Vector3(160, 1350, -100),
  new Vector3(-120, 900, -800),
  new Vector3(rx(-1250) + 60, 230, -1250),
  new Vector3(rx(-1950) - 40, 70, -1950),
  new Vector3(rx(-2450), 26, -2450),
  new Vector3(rx(-2900) + 20, 22, -2900),
  new Vector3(rx(-3150), 30, -3150),
]);

const targetPath = new CatmullRomCurve3([
  new Vector3(0, 1700, -2500),
  new Vector3(150, 900, -1300),
  new Vector3(80, 380, -1700),
  new Vector3(CLIFF.x - 125, 150, CLIFF.z + 20),
  new Vector3(rx(-2300), 20, -2400),
  new Vector3(rx(-2900), 10, -3000),
  new Vector3(rx(-3300), 20, -3500),
  new Vector3(rx(-3600), 60, -4200),
]);

export interface CameraPose {
  position: Vector3;
  target: Vector3;
}

/** Camera position + look target for scroll progress p (clamped to 0–1). */
export function cameraPose(p: number, out: CameraPose = { position: new Vector3(), target: new Vector3() }): CameraPose {
  const t = Math.min(1, Math.max(0, p));
  positionPath.getPointAt(t, out.position);
  targetPath.getPointAt(t, out.target);
  return out;
}
