/**
 * scenePreference.ts — remembers the scenery the user picked on the Passport
 * page ("Realistic 3D" or "Photos"). null = let TripWise decide per device.
 * Never throws: storage can be blocked in private browsing.
 */
import type { ScenePack } from './quality';

const KEY = 'tw_scene';

export function readScenePreference(): ScenePack | null {
  try {
    const saved = window.localStorage.getItem(KEY);
    return saved === 'world3d' || saved === 'photo' ? saved : null;
  } catch {
    return null;
  }
}

export function saveScenePreference(pack: ScenePack | null) {
  try {
    if (pack) window.localStorage.setItem(KEY, pack);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice applies to this visit only.
  }
}
