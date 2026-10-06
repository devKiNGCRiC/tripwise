/**
 * Scenery.tsx — the fixed background world behind the landing page.
 *
 * Always paints the photo scenery first (instant, light), then — on capable
 * devices — loads the 3D world in the background and cross-fades it in on top.
 * If 3D fails for any reason, the photos simply stay. That keeps first paint
 * fast on every connection while still giving strong devices the full world.
 */
import { lazy, Suspense, useCallback, useState } from 'react';
import { PhotoDescent } from './photo/PhotoDescent';
import { chooseScene, readDeviceInfo, type SceneChoice } from './quality';
import { readScenePreference } from './scenePreference';

// Separate chunk: Three.js, post-processing and the world only download when 3D is used.
const WorldCanvas = lazy(() => import('./world/WorldCanvas'));

export function Scenery() {
  // Decided once per visit: device facts + the user's saved preference.
  const [choice] = useState<SceneChoice>(() => chooseScene(readDeviceInfo(readScenePreference())));
  const [worldReady, setWorldReady] = useState(false);
  const [worldFailed, setWorldFailed] = useState(false);

  const onReady = useCallback(() => setWorldReady(true), []);
  const onError = useCallback((error: unknown) => {
    console.warn('[TripWise] 3D scenery unavailable, using photos instead.', error);
    setWorldFailed(true);
  }, []);

  const use3D = choice.pack === 'world3d' && !worldFailed;

  return (
    <>
      {/* Photos stay mounted underneath until the 3D world has fully faded in */}
      {!(use3D && worldReady) && <PhotoDescent />}
      {use3D && (
        <Suspense fallback={null}>
          <WorldCanvas tier={choice.tier} motion={choice.motion} visible={worldReady} onReady={onReady} onError={onError} />
        </Suspense>
      )}
    </>
  );
}
