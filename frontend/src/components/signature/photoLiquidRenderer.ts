/**
 * photoLiquidRenderer.ts — draws full-screen photos as living water (photoLiquidShader.ts).
 *
 * `show(url)` loads a photo (once; it's cached on the GPU) and pours it in over the
 * current one. Requests made while a photo is still downloading are coalesced: only
 * the latest wins. `onReady` fires after the very first photo is on screen, so the
 * component can fade the canvas in over its plain <img> stand-in.
 * Pauses off screen / in hidden tabs; `still` mode (reduced motion) cuts instead of
 * pouring and only redraws when something changes. Returns null without WebGL.
 */
import { PHOTO_LIQUID_FRAGMENT } from './photoLiquidShader';
import { createFullscreenProgram, createRipples, getGL } from './webgl';

export interface PhotoLiquidOptions {
  /** Starting grade: 0 = dawn, 1 = monsoon. */
  night: number;
  /** Freeze motion (reduced motion): no shimmer, no ripples, instant photo changes. */
  still: boolean;
  /** Element whose pointer events make ripples. */
  host?: HTMLElement | null;
  /** Called once, when the first photo has been drawn. */
  onReady?: () => void;
}

export interface PhotoLiquidHandle {
  /** Pour in the photo at `url` (loads it first if needed). */
  show: (url: string) => void;
  /** Ease the grade toward 0 (dawn) or 1 (monsoon). */
  setNight: (target: number) => void;
  dispose: () => void;
}

/** A photo uploaded to the GPU, with its pixel size for cover-fitting. */
interface Photo {
  texture: WebGLTexture;
  width: number;
  height: number;
}

/** How long the liquid front takes to sweep across (seconds). */
const POUR_SECONDS = 1.8;
/** Age used for the settled Ken Burns zoom in still mode. */
const SETTLED_AGE = 10;

/** Start the photo-water effect in `canvas`. Returns null if WebGL isn't available. */
export function createPhotoLiquid(canvas: HTMLCanvasElement, options: PhotoLiquidOptions): PhotoLiquidHandle | null {
  const gl = getGL(canvas);
  if (!gl) return null;
  const setup = createFullscreenProgram(gl, PHOTO_LIQUID_FRAGMENT);
  if (!setup) return null;
  const { program, buffer } = setup;
  const loc = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    fromTex: loc('fromTex'),
    toTex: loc('toTex'),
    fromSize: loc('fromSize'),
    toSize: loc('toSize'),
    fromAge: loc('fromAge'),
    toAge: loc('toAge'),
    progress: loc('progress'),
    t: loc('t'),
    night: loc('night'),
    res: loc('res'),
    pointer: loc('pointer'),
    ripples: loc('ripples'),
  };
  gl.uniform1i(u.fromTex, 0);
  gl.uniform1i(u.toTex, 1);

  // ── State ──
  const start = performance.now();
  const seconds = () => (performance.now() - start) / 1000;
  const now = () => (options.still ? 4 : seconds());
  const touch = createRipples(canvas, options.host ?? canvas.parentElement, now, !options.still);
  const cache = new Map<string, Promise<Photo | null>>();
  let from: Photo | null = null;
  let to: Photo | null = null;
  let fromStart = 0;
  let toStart = 0;
  let pourStart = -99;
  let wanted = ''; // latest requested url (older requests are dropped)
  let night = options.night;
  let nightTarget = options.night;
  let visible = true;
  let dirty = true;
  let lost = false;
  let disposed = false;
  let ready = false;
  let frame = 0;
  let lastTick = performance.now();

  /** Download + upload one photo (cached per url). Resolves null if it can't load. */
  function load(url: string): Promise<Photo | null> {
    let pending = cache.get(url);
    if (!pending) {
      pending = new Promise<Photo | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Unsplash allows it; required to use the pixels in WebGL
        img.decoding = 'async';
        img.onload = () => {
          if (disposed || lost) return resolve(null);
          const texture = gl!.createTexture()!;
          gl!.bindTexture(gl!.TEXTURE_2D, texture);
          // Photos aren't power-of-two sized: clamp + linear, no mipmaps (WebGL 1 rules).
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
          gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
          gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, img);
          resolve({ texture, width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
      cache.set(url, pending);
    }
    return pending;
  }

  /** Match the drawing buffer to the element (photos stay sharp: up to 1.25× density). */
  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
    }
    dirty = true;
  }
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(canvas);
  const viewObserver =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
        });
  viewObserver?.observe(canvas);
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  canvas.addEventListener('webglcontextlost', onLost);

  /** One frame: ease the grade, advance the pour, draw. */
  function tick() {
    frame = requestAnimationFrame(tick);
    const time = performance.now();
    const dt = Math.min(0.1, (time - lastTick) / 1000);
    lastTick = time;
    if (lost || !visible || document.hidden || !from || !to) return;

    if (night !== nightTarget) {
      night = options.still ? nightTarget : night + (nightTarget - night) * (1 - Math.exp(-dt * 3.5));
      if (Math.abs(nightTarget - night) < 0.002) night = nightTarget;
      dirty = true;
    }
    const s = seconds();
    // Pour progress with an ease-in-out; once done, the arrived photo becomes the base.
    const raw = options.still ? 1 : Math.min(1, (s - pourStart) / POUR_SECONDS);
    const progress = raw * raw * (3 - 2 * raw);
    if (raw >= 1 && from !== to) {
      from = to;
      fromStart = toStart;
    }
    if (options.still && !dirty) return;

    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, from.texture);
    gl!.activeTexture(gl!.TEXTURE1);
    gl!.bindTexture(gl!.TEXTURE_2D, to.texture);
    gl!.uniform2f(u.fromSize, from.width, from.height);
    gl!.uniform2f(u.toSize, to.width, to.height);
    gl!.uniform1f(u.fromAge, options.still ? SETTLED_AGE : s - fromStart);
    gl!.uniform1f(u.toAge, options.still ? SETTLED_AGE : s - toStart);
    gl!.uniform1f(u.progress, from === to ? 1 : progress);
    gl!.uniform1f(u.t, now());
    gl!.uniform1f(u.night, night);
    gl!.uniform2f(u.res, canvas.width, canvas.height);
    gl!.uniform2f(u.pointer, touch.pointer[0], touch.pointer[1]);
    gl!.uniform3fv(u.ripples, touch.ripples);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    dirty = false;

    if (!ready) {
      ready = true;
      options.onReady?.();
    }
  }
  resize();
  frame = requestAnimationFrame(tick);

  return {
    show(url) {
      wanted = url;
      void load(url).then((photo) => {
        if (!photo || disposed || wanted !== url || photo === to) return;
        const s = seconds();
        if (!to) {
          // First photo: just appear (the <img> stand-in is already showing it).
          from = to = photo;
          fromStart = toStart = s;
        } else {
          // The photo that was arriving becomes the base (a click mid-pour simply skips ahead).
          from = to;
          fromStart = toStart;
          to = photo;
          toStart = s;
          pourStart = s;
        }
        dirty = true;
      });
    },
    setNight(target) {
      nightTarget = target;
      dirty = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      viewObserver?.disconnect();
      touch.detach();
      canvas.removeEventListener('webglcontextlost', onLost);
      void Promise.all(cache.values()).then((photos) => photos.forEach((p) => p && gl.deleteTexture(p.texture)));
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
