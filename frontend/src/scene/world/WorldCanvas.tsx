/**
 * WorldCanvas.tsx — React wrapper around the 3D world (lazy-loaded chunk).
 *
 * Mounts a fixed full-screen canvas, builds the world in the background, then
 * tells its parent it's ready (so it can cross-fade in over the photo scene).
 * Feeds the world with scroll progress, Day/Night and pointer position.
 * Safe under React StrictMode: a world finished after unmount is disposed.
 */
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { descentProgress } from '../descent';
import type { SceneTier } from '../quality';
import { createWorld, type World } from './createWorld';

interface WorldCanvasProps {
  tier: SceneTier;
  motion: boolean;
  visible: boolean;
  onReady: () => void;
  onError: (error: unknown) => void;
}

export default function WorldCanvas({ tier, motion, visible, onReady, onError }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const { theme } = useTheme();
  const nightRef = useRef(theme === 'dark');
  nightRef.current = theme === 'dark';

  // Build once per tier; tear everything down on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let unsubscribe = () => {};
    createWorld(canvas, { tier, motion, night: nightRef.current })
      .then((world) => {
        if (cancelled) {
          world.dispose();
          return;
        }
        worldRef.current = world;
        world.setProgress(descentProgress.get());
        unsubscribe = descentProgress.subscribe(() => world.setProgress(descentProgress.get()));
        onReady();
      })
      .catch((error) => {
        if (!cancelled) onError(error);
      });
    return () => {
      cancelled = true;
      unsubscribe();
      worldRef.current?.dispose();
      worldRef.current = null;
    };
    // onReady/onError are stable callbacks from the parent; rebuilding on their identity would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, motion]);

  // Sunset / sunrise when the theme changes.
  useEffect(() => {
    worldRef.current?.setNight(theme === 'dark');
  }, [theme]);

  // Gentle look-around following the pointer.
  useEffect(() => {
    if (!motion) return;
    const onMove = (e: PointerEvent) => worldRef.current?.setPointer(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [motion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 size-full transition-opacity duration-[1400ms] ease-out', visible ? 'opacity-100' : 'opacity-0')}
    />
  );
}
