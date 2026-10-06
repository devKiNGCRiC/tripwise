/**
 * Scenery.tsx — the fixed background world behind the landing page.
 *
 * Always paints the photo scenery first (instant, light), then — on capable
 * devices — loads the 3D world in the background and cross-fades it in on top.
 * If 3D fails for any reason (chunk didn't download, GPU trouble, context lost),
 * the photos simply come back. That keeps first paint fast on every connection
 * while still giving strong devices the full world.
 */
import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { PhotoDescent } from './photo/PhotoDescent';
import { chooseScene, readDeviceInfo, type SceneChoice } from './quality';
import { readScenePreference } from './scenePreference';
import { startTerrainJob } from './world/terrainJob';

// Separate chunk: Three.js, post-processing and the world only download when 3D is used.
const WorldCanvas = lazy(() => import('./world/WorldCanvas'));

/** Matches WorldCanvas's fade-in (1.4s) plus a little slack. */
const FADE_MS = 1500;

/**
 * Catches anything the 3D layer throws while loading or rendering (e.g. a failed
 * chunk download after a deploy) so it can never replace the page with an error screen.
 */
class WorldBoundary extends Component<{ onError: (error: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Picks photos or 3D for this visit and layers them (see file header). */
export function Scenery() {
  // Decided once per visit: device facts + the user's saved preference.
  const [choice] = useState<SceneChoice>(() => chooseScene(readDeviceInfo(readScenePreference())));
  const [worldReady, setWorldReady] = useState(false);
  const [worldFailed, setWorldFailed] = useState(false);
  const [photosHidden, setPhotosHidden] = useState(false);

  const onReady = useCallback(() => setWorldReady(true), []);
  const onError = useCallback((error: unknown) => {
    console.warn('[TripWise] 3D scenery unavailable, using photos instead.', error);
    setWorldFailed(true);
  }, []);

  const use3D = choice.pack === 'world3d' && !worldFailed;

  // Kick off the terrain build right away, in parallel with downloading the 3D code.
  useEffect(() => {
    if (choice.pack === 'world3d') startTerrainJob(choice.tier).catch(() => {}); // failures surface via createWorld
  }, [choice]);

  // Remove the photos only after the 3D world has finished fading in (no blank flash),
  // and bring them straight back if 3D fails later.
  useEffect(() => {
    if (!use3D || !worldReady) {
      setPhotosHidden(false);
      return;
    }
    const timer = window.setTimeout(() => setPhotosHidden(true), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [use3D, worldReady]);

  return (
    <>
      {!(use3D && photosHidden) && <PhotoDescent />}
      {use3D && (
        <WorldBoundary onError={onError}>
          <Suspense fallback={null}>
            <WorldCanvas tier={choice.tier} motion={choice.motion} visible={worldReady} onReady={onReady} onError={onError} />
          </Suspense>
        </WorldBoundary>
      )}
    </>
  );
}
