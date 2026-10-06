/**
 * quality.ts — decides which scenery a device gets, and at what detail.
 *
 *   world3d → the full 3D world (Three.js) — capable desktops, laptops and strong phones
 *   photo   → the real-photo descent — budget phones, Data Saver, no WebGL2, reduced motion
 *
 * Pure function (no browser access) so it's easy to test; `readDeviceInfo()`
 * gathers the real values in the browser.
 */
export type ScenePack = 'world3d' | 'photo';
export type SceneTier = 'high' | 'low';

export interface DeviceInfo {
  /** Browser can create a WebGL2 context. */
  webgl2: boolean;
  /** navigator.deviceMemory in GB (Chrome/Edge only; undefined elsewhere). */
  deviceMemory?: number;
  /** Viewport width in CSS px. */
  width: number;
  /** User turned on Data Saver / Lite mode. */
  saveData: boolean;
  /** User asked the OS for reduced motion. */
  reducedMotion: boolean;
  /** Explicit choice from the Passport page, if any. */
  preference?: ScenePack | null;
}

export interface SceneChoice {
  pack: ScenePack;
  tier: SceneTier;
  /** Whether scroll-driven/ambient motion should run at all. */
  motion: boolean;
}

export function chooseScene(info: DeviceInfo): SceneChoice {
  const motion = !info.reducedMotion;
  // Unknown memory (Safari/Firefox don't report it) is treated as "probably fine".
  const memory = info.deviceMemory ?? 8;
  const tier: SceneTier = info.width >= 1200 && memory >= 8 ? 'high' : 'low';
  const photo: SceneChoice = { pack: 'photo', tier: 'low', motion };

  // Hard limits first: no WebGL2 → no 3D, and reduced motion → calm photos.
  if (!info.webgl2 || info.reducedMotion) return photo;
  // An explicit choice wins over our guesses.
  if (info.preference === 'photo') return photo;
  if (info.preference === 'world3d') return { pack: 'world3d', tier, motion };
  // Our guesses: protect data plans and weak devices.
  if (info.saveData || memory < 4) return photo;
  if (info.width < 768 && memory < 6) return photo;
  return { pack: 'world3d', tier, motion };
}

/** Gather the real device facts (browser only). */
export function readDeviceInfo(preference?: ScenePack | null): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let webgl2 = false;
  try {
    webgl2 = typeof WebGL2RenderingContext !== 'undefined' && !!document.createElement('canvas').getContext('webgl2');
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    deviceMemory: nav.deviceMemory,
    width: window.innerWidth,
    saveData: Boolean(nav.connection?.saveData),
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    preference,
  };
}
