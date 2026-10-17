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
import { LIQUID_FRAGMENT, LIQUID_VERTEX, MAX_RIPPLES } from './liquidShader';

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
  /** Stop drawing and free the GPU context. */
  dispose: () => void;
}

/** Fraction of CSS pixels we actually render (see file header). */
const RESOLUTION = 0.6;
/** Seconds between ripples while the pointer moves. */
const MOVE_RIPPLE_GAP = 0.4;
/** A fixed, pleasant moment in time used for the frozen (still) frame. */
const STILL_TIME = 4;

/** Compile one shader stage; throws with the GPU's message if it fails. */
function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
}

/** Start drawing the liquid into `canvas`. Returns null if WebGL isn't available. */
export function createLiquid(canvas: HTMLCanvasElement, options: LiquidOptions): LiquidHandle | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  // ── Program + full-screen triangle ──
  const program = gl.createProgram()!;
  try {
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, LIQUID_VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, LIQUID_FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // One triangle bigger than the screen covers it completely (cheaper than two).
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const u = {
    t: gl.getUniformLocation(program, 't'),
    night: gl.getUniformLocation(program, 'night'),
    res: gl.getUniformLocation(program, 'res'),
    pointer: gl.getUniformLocation(program, 'pointer'),
    ripples: gl.getUniformLocation(program, 'ripples'),
  };

  // ── State ──
  const ripples = new Float32Array(MAX_RIPPLES * 3).fill(-99); // start times far in the past = inactive
  let nextRipple = 0;
  let lastMoveRipple = 0;
  const pointer = [0.5, 0.5];
  let night = options.night;
  let nightTarget = options.night;
  let visible = true;
  let dirty = true; // still mode: redraw only when something changed
  let frame = 0;
  let lost = false;
  const start = performance.now();
  let lastTick = start;
  const now = () => (options.still ? STILL_TIME : (performance.now() - start) / 1000);

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

  /** Pointer position → 0–1 coordinates inside the canvas (y up, like the shader). */
  function toUv(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height];
  }
  /** Start a ripple at the pointer (overwrites the oldest one). */
  function addRipple(event: PointerEvent) {
    const [x, y] = toUv(event);
    ripples.set([x, y, now()], nextRipple * 3);
    nextRipple = (nextRipple + 1) % MAX_RIPPLES;
  }
  const onDown = (event: PointerEvent) => addRipple(event);
  const onMove = (event: PointerEvent) => {
    [pointer[0], pointer[1]] = toUv(event);
    if (now() - lastMoveRipple > MOVE_RIPPLE_GAP) {
      addRipple(event);
      lastMoveRipple = now();
    }
  };
  const host = options.host ?? canvas.parentElement;
  if (options.interactive && !options.still && host) {
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
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
    gl!.uniform2f(u.pointer, pointer[0], pointer[1]);
    gl!.uniform3fv(u.ripples, ripples);
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
      host?.removeEventListener('pointerdown', onDown);
      host?.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl!.deleteBuffer(buffer);
      gl!.deleteProgram(program);
      // No loseContext() here: React may re-mount on the same <canvas> (StrictMode), and a
      // lost context can't be reused. The context is freed with the canvas element.
    },
  };
}
