/**
 * webgl.ts — small shared helpers for TripWise's two WebGL effects
 * (the liquid colour field and the liquid photo hero):
 *   getGL()                  → a WebGL 1 context, or null if unavailable
 *   createFullscreenProgram() → compiles a fragment shader onto one full-screen triangle
 *   createRipples()          → pointer tracking + a ring buffer of ripples for the shaders
 */
import { LIQUID_VERTEX, MAX_RIPPLES } from './liquidShader';

/** Seconds between ripples while the pointer moves. */
const MOVE_RIPPLE_GAP = 0.4;

/** Ask for a cheap WebGL 1 context; null when the browser/GPU can't provide one. */
export function getGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  try {
    return canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
}

/** Compile one shader stage; throws with the GPU's message if it fails. */
function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
}

/**
 * Build a program from the shared full-screen vertex shader + `fragment`, bind one
 * triangle bigger than the screen (cheaper than two), and make it current.
 * Returns null if compiling or linking fails.
 */
export function createFullscreenProgram(gl: WebGLRenderingContext, fragment: string) {
  const program = gl.createProgram()!;
  try {
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, LIQUID_VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  return { program, buffer };
}

/**
 * Pointer tracking for the shaders: the latest pointer position (0–1, y up) and a ring
 * buffer of ripples [x, y, startTime] fed by taps and by movement (one per 0.4s).
 * `now` supplies the shader clock. Call `detach()` to remove the listeners.
 */
export function createRipples(canvas: HTMLCanvasElement, host: HTMLElement | null, now: () => number, enabled: boolean) {
  const ripples = new Float32Array(MAX_RIPPLES * 3).fill(-99); // start times far in the past = inactive
  const pointer = new Float32Array([0.5, 0.5]);
  let next = 0;
  let lastMove = -99;

  /** Pointer position → 0–1 coordinates inside the canvas (y up, like the shaders). */
  function toUv(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height];
  }
  /** Start a ripple at the pointer (overwrites the oldest one). */
  function add(event: PointerEvent) {
    const [x, y] = toUv(event);
    ripples.set([x, y, now()], next * 3);
    next = (next + 1) % MAX_RIPPLES;
  }
  const onDown = (event: PointerEvent) => add(event);
  const onMove = (event: PointerEvent) => {
    pointer.set(toUv(event));
    if (now() - lastMove > MOVE_RIPPLE_GAP) {
      add(event);
      lastMove = now();
    }
  };
  if (enabled && host) {
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
  }
  return {
    ripples,
    pointer,
    detach() {
      host?.removeEventListener('pointerdown', onDown);
      host?.removeEventListener('pointermove', onMove);
    },
  };
}
