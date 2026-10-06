/**
 * Globe.tsx — decides which globe a visitor gets:
 *  - the 3D Three.js scene (lazy-loaded) on screens ≥ 640px with WebGL and normal motion,
 *  - otherwise the light CSS fallback (also shown while the 3D code downloads,
 *    and if the 3D scene crashes for any reason).
 * This keeps phones fast and the page useful everywhere.
 */
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { GlobeFallback } from './GlobeFallback';

// Separate chunk: Three.js is only downloaded when the 3D globe is actually shown.
const GlobeScene = lazy(() => import('./GlobeScene'));

/** True when this device can (and should) render the 3D globe. */
function canRender3D(): boolean {
  if (typeof WebGLRenderingContext === 'undefined') return false;
  if (window.innerWidth < 640) return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** If the 3D scene throws (e.g. the GPU context is lost), quietly show the fallback. */
class GlobeErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <GlobeFallback /> : this.props.children;
  }
}

export function Globe({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();
  const { theme } = useTheme();
  // Checked once: creating test WebGL contexts repeatedly is wasteful.
  const [supports3D] = useState(canRender3D);

  return (
    <div className={cn('relative aspect-square w-full', className)}>
      {supports3D && !reduceMotion ? (
        <GlobeErrorBoundary>
          <Suspense fallback={<GlobeFallback />}>
            <GlobeScene dark={theme === 'dark'} />
          </Suspense>
        </GlobeErrorBoundary>
      ) : (
        <GlobeFallback />
      )}
    </div>
  );
}
