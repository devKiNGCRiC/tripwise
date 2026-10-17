/**
 * LivingWorld.tsx — the full-screen canvas behind every page, drawing the current
 * region's landscape (scene.ts) many times a second.
 *
 * - Pointer and scroll parallax (layers move by their depth).
 * - Region changes cross-fade the old world into the new one over 1.4 s.
 * - Day ↔ Night eases (~1 s); a photo palette tints the scene with a `color` blend.
 * - Pauses while the tab is hidden; device pixel ratio capped at 1.5; at most ~60 frames a
 *   second (120 Hz screens don't draw twice as often — saves battery on laptops).
 * - Reduced / Calm motion: one still frame, redrawn only when something changes.
 * - No canvas support (old browsers, tests): renders nothing — the CSS sky shows instead.
 */
import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';
import { smoothstep } from './noise';
import { Scene } from './scene';
import { useWorld } from './WorldProvider';

/** Cross-fade length when the region changes. */
const FADE_MS = 1400;
/** Maximum device pixel ratio we render at. */
const MAX_DPR = 1.5;
/** Strength of the photo tint over the scene. */
const TINT_ALPHA = 0.38;
/** Minimum time between drawn frames (~60 fps cap). */
const MIN_FRAME_MS = 15;
/** The fixed moment shown when motion is reduced. */
const STILL_SECONDS = 30;

/** The fixed, full-screen canvas the living landscape is drawn on. */
export function LivingWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { region, tint } = useWorld();
  const { theme } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  // Latest values for the animation loop (read every frame without restarting it).
  const live = useRef({ region, tintColour: tint?.tint ?? null, night: theme === 'dark' ? 1 : 0, still: reduceMotion, dirty: true });

  useEffect(() => {
    live.current = { region, tintColour: tint?.tint ?? null, night: theme === 'dark' ? 1 : 0, still: reduceMotion, dirty: true };
  }, [region, tint, theme, reduceMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let frame = 0;
    let current = new Scene(live.current.region);
    let previous: Scene | null = null;
    let fadeStart = 0;
    let night = live.current.night;
    let lastDraw = -Infinity;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    /** Match the canvas to the window (sharp, but capped for speed). */
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      live.current.dirty = true;
    }
    /** Remember where the pointer is (as −0.5…0.5 from the centre). */
    const onPointer = (event: PointerEvent) => {
      pointer.tx = event.clientX / w - 0.5;
      pointer.ty = event.clientY / h - 0.5;
    };

    /** One animation frame. */
    function tick(ms: number) {
      frame = requestAnimationFrame(tick);
      if (document.hidden || ms - lastDraw < MIN_FRAME_MS) return;
      const state = live.current;

      // A new region: start cross-fading (instantly in still mode).
      if (state.region !== current.region) {
        previous = state.still ? null : current;
        current = new Scene(state.region);
        fadeStart = ms;
        state.dirty = true;
      }
      const fading = previous !== null;
      const easingNight = Math.abs(state.night - night) > 0.002;
      if (state.still && !state.dirty && !fading && !easingNight) return;

      // Ease towards the target night level and pointer position.
      night = state.still ? state.night : night + (state.night - night) * 0.05;
      if (!state.still) {
        pointer.x += (pointer.tx - pointer.x) * 0.06;
        pointer.y += (pointer.ty - pointer.y) * 0.06;
      }
      const seconds = state.still ? STILL_SECONDS : ms / 1000;
      const scroll = Math.min(window.scrollY, h * 2);

      current.draw(ctx!, w, h, seconds, night, pointer.x, pointer.y, scroll);
      if (previous) {
        const k = (ms - fadeStart) / FADE_MS;
        if (k >= 1) previous = null;
        else previous.draw(ctx!, w, h, seconds, night, pointer.x, pointer.y, scroll, 1 - smoothstep(0, 1, k));
      }
      if (state.tintColour) {
        ctx!.save();
        ctx!.globalCompositeOperation = 'color';
        ctx!.globalAlpha = TINT_ALPHA;
        ctx!.fillStyle = state.tintColour;
        ctx!.fillRect(0, 0, w, h);
        ctx!.restore();
      }
      state.dirty = false;
      lastDraw = ms;
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointer);
    // In still mode, scrolling changes the parallax too — redraw once per scroll.
    const onScroll = () => {
      live.current.dirty = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-20 block size-full" />;
}
