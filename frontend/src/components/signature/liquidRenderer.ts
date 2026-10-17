/**
 * liquidRenderer.ts — draws the liquid colour field into a <canvas> with plain WebGL 1.
 *
 * No 3D library: one full-screen triangle and one fragment shader (liquidShader.ts),
 * so it costs a few KB instead of three.js. Kept cheap on purpose:
 *  - renders at ~60% resolution (the field is soft, upscaling is invisible)
 *  - pauses while off screen or while the tab is hidden
 *  - `still` mode (reduced motion) draws a frozen frame and only redraws on resize/theme change
 * Returns null when WebGL is unavailable; callers keep a CSS gradient behind the canvas.
 */
import { LIQUID_FRAGMENT } from './liquidShader';
import { createFullscreenProgram, createRipples, getGL } from './webgl';

export interface LiquidOptions {
  /** Starting palette: 0 = dawn, 1 = monsoon. */
  night: number;
  /** React to the pointer with ripples. */
  interactive: boolean;
  /** Element whose pointer events make ripples (usually the section around the canvas). */
  host?: HTMLElement | null;
  /** Freeze time (reduced motion): no drifting, no ripples. */
  still: boolean;
}

export interface LiquidHandle {
  /** Ease the palette toward 0 (dawn) or 1 (monsoon). */
  setNight: (target: number) => void;
  /** Stop drawing and free the GPU resources. */
  dispose: () => void;
}

/** Fraction of CSS pixels we actually render (see file header). */
const RESOLUTION = 0.6;
/** A fixed, pleasant moment in time used for the frozen (still) frame. */
const STILL_TIME = 4;

/** Start drawing the liquid into `canvas`. Returns null if WebGL isn't available. */
export function createLiquid(canvas: HTMLCanvasElement, options: LiquidOptions): LiquidHandle | null {
  const gl = getGL(canvas);
  if (!gl) return null;
  const setup = createFullscreenProgram(gl, LIQUID_FRAGMENT);
  if (!setup) return null;
  const { program, buffer } = setup;

  const u = {
    t: gl.getUniformLocation(program, 't'),
    night: gl.getUniformLocation(program, 'night'),
    res: gl.getUniformLocation(program, 'res'),
    pointer: gl.getUniformLocation(program, 'pointer'),
    ripples: gl.getUniformLocation(program, 'ripples'),
  };

  // ── State ──
  let night = options.night;
  let nightTarget = options.night;
  let visible = true;
  let dirty = true; // still mode: redraw only when something changed
  let frame = 0;
  let lost = false;
  const start = performance.now();
  let lastTick = start;
  const now = () => (options.still ? STILL_TIME : (performance.now() - start) / 1000);
  const touch = createRipples(canvas, options.host ?? canvas.parentElement, now, options.interactive && !options.still);

  /** Match the drawing buffer to the element's size (at reduced resolution). */
  function resize() {
    const scale = RESOLUTION * Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
    }
    dirty = true;
  }

  // Pause while scrolled out of view; resize with the element.
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(canvas);
  const viewObserver =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
        });
  viewObserver?.observe(canvas);

  // The GPU can drop our context (driver reset, too many tabs): stop quietly, the CSS gradient shows.
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  canvas.addEventListener('webglcontextlost', onLost);

  /** One animation frame: ease the palette, then draw if anything needs drawing. */
  function tick() {
    frame = requestAnimationFrame(tick);
    const time = performance.now();
    const dt = Math.min(0.1, (time - lastTick) / 1000);
    lastTick = time;
    if (lost || !visible || document.hidden) return;

    // Ease toward the target palette (~1s); instant when still.
    if (night !== nightTarget) {
      night = options.still ? nightTarget : night + (nightTarget - night) * (1 - Math.exp(-dt * 3.5));
      if (Math.abs(nightTarget - night) < 0.002) night = nightTarget;
      dirty = true;
    }
    if (options.still && !dirty) return;

    gl!.uniform1f(u.t, now());
    gl!.uniform1f(u.night, night);
    gl!.uniform2f(u.res, canvas.width, canvas.height);
    gl!.uniform2f(u.pointer, touch.pointer[0], touch.pointer[1]);
    gl!.uniform3fv(u.ripples, touch.ripples);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    dirty = false;
  }
  resize();
  frame = requestAnimationFrame(tick);

  return {
    setNight(target) {
      nightTarget = target;
      dirty = true;
    },
    dispose() {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      viewObserver?.disconnect();
      touch.detach();
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      // No loseContext() here: React may re-mount on the same <canvas> (StrictMode), and a
      // lost context can't be reused. The context is freed with the canvas element.
    },
  };
}
