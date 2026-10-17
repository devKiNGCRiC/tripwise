/**
 * scene.ts — draws one region's living landscape onto a 2-D canvas, every frame.
 *
 * Far-to-near terrain layers (mountains, dunes, plateaus, hills, water, mist) with details
 * (pines, ghat temples, a desert fort, camels, ruins, waterfalls, tea terraces, palms),
 * signature landmarks (a Himalayan shrine, prayer flags, a chhatri, a gopuram, a monastery,
 * a lighthouse), light-and-shade on every slope, and haze that fades distant ridges,
 * a sky with sun or moon, and weather & life (birds, kites, stars, snow, rain, fireflies,
 * diyas, boats, glitter). Everything is procedural — no images — and seeded, so a region
 * always looks the same. Layers shift with the pointer and the scroll (parallax).
 * Framework-free: LivingWorld.tsx owns the canvas and calls draw().
 */
import { clamp, fbm1, lerp, mixHex, rng, smoothstep } from './noise';
import type { Fx, LandmarkKind, Layer, Region } from './regions';

/** A land layer, narrowed from the Layer union. */
type Land = Extract<Layer, { kind: 'land' }>;
/** Ridge points [x, y] in pixels, left to right. */
type Ridge = [number, number][];

/** Extra width drawn beyond each screen edge so parallax never shows a gap. */
const PAD = 140;

export class Scene {
  readonly region: Region;
  private shapes: (((x: number) => number) | null)[];
  // Particle positions (fractions of the screen) and phases, seeded per region.
  private stars: number[][];
  private snow: number[][];
  private rain: number[][];
  private sand: number[][];
  private flies: number[][];
  private diyas: number[][];
  private birds: number[][];
  private kites: number[][];
  private boats: number[][];

  constructor(region: Region) {
    this.region = region;
    this.shapes = region.layers.map((layer) => (layer.kind === 'land' ? Scene.shapeFn(layer) : null));
    const r = rng(region.key.length * 977 + 3);
    const make = (n: number, f: () => number[]) => Array.from({ length: n }, f);
    this.stars = make(160, () => [r(), r() * 0.55, r() * 1.4 + 0.3, r() * 6]);
    this.snow = make(140, () => [r(), r(), r() * 1.8 + 0.6, r()]);
    this.rain = make(220, () => [r(), r(), r() * 0.5 + 0.5]);
    this.sand = make(160, () => [r(), r() * 0.35 + 0.55, r() * 1.2 + 0.4, r()]);
    this.flies = make(46, () => [r(), r() * 0.3 + 0.62, r() * 6, r() * 6]);
    this.diyas = make(34, () => [r(), r() * 0.26 + 0.7, r() * 6]);
    this.birds = make(7, () => [r(), r() * 0.25 + 0.12, r() * 0.5 + 0.6, r() * 6]);
    this.kites = make(5, () => [r() * 0.9 + 0.05, r() * 0.25 + 0.14, r() * 6, Math.floor(r() * 4)]);
    this.boats = make(4, () => [r(), r() * 0.18 + 0.7, r() * 0.5 + 0.5]);
  }

  /** Height function (0–1, 1 = tallest) for a land layer's ridge shape. */
  private static shapeFn(layer: Land): (x: number) => number {
    const f = fbm1(layer.seed * 131 + 7);
    switch (layer.shape) {
      case 'mountains':
        // Rounded (Ghats) or jagged ridged peaks (Himalaya)
        return layer.round ? (x) => Math.pow((f(x * layer.freq) + 1) / 2, 1.3) : (x) => Math.pow(1 - Math.abs(f(x * layer.freq)), 2.2);
      case 'dunes':
        // Long windward slope, short steep lee face, plus a little noise
        return (x) => {
          const p = (((x * layer.freq * 3 + layer.seed * 0.37) % 1) + 1) % 1;
          const d = p < 0.72 ? Math.pow(p / 0.72, 1.6) : Math.pow(1 - (p - 0.72) / 0.28, 0.9);
          return d * 0.75 + (f(x * layer.freq) + 1) * 0.12;
        };
      case 'plateau':
        // Flat-topped mesas with steep sides
        return (x) => {
          const n = (f(x * layer.freq) + 1) / 2;
          return smoothstep(0.42, 0.5, n) * 0.8 + n * 0.2;
        };
      default:
        return (x) => (f(x * layer.freq) + 1) / 2;
    }
  }

  /**
   * Draw the whole scene.
   * @param seconds  time, for animation
   * @param night    0 = day … 1 = night (eased by the caller)
   * @param mx, my   pointer offset from screen centre, −0.5…0.5
   * @param scroll   page scroll in px (nearer layers rise more)
   * @param alpha    overall opacity (used to cross-fade regions)
   */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, seconds: number, night: number, mx: number, my: number, scroll: number, alpha = 1) {
    const r = this.region;
    ctx.save();
    ctx.globalAlpha = alpha;
    this.sky(ctx, w, h, seconds, night, mx, my, scroll);

    // Birds and kites fly in the sky, behind the land (day only)
    if (night < 0.99) {
      ctx.globalAlpha = alpha * (1 - night);
      this.skyLife(ctx, w, h, seconds, scroll);
      ctx.globalAlpha = alpha;
    }

    // Terrain layers, far to near, each shifted by its own depth
    r.layers.forEach((layer, i) => {
      const depth = layer.kind === 'land' || layer.kind === 'water' ? layer.depth : 0.1;
      const dx = mx * depth * 90;
      const dy = my * depth * 30 - scroll * depth * 0.55;
      if (layer.kind === 'mist') return this.mist(ctx, w, h, seconds, layer, night, dx, dy * 0.6);
      if (layer.kind === 'water') return this.water(ctx, w, h, seconds, layer, night, dx, dy);
      if (layer.kind === 'sand') return night < 0.9 && this.blowingSand(ctx, w, h, seconds, 1 - night);
      this.land(ctx, w, h, seconds, layer, this.shapes[i]!, night, dx, dy);
      this.haze(ctx, w, h, layer, night, dy);
    });

    // Weather and life in front: day effects fade out as night fades in, and vice versa
    for (const fx of r.fx.day) {
      if (night >= 0.99) break;
      ctx.globalAlpha = alpha * (1 - night);
      this.front(ctx, w, h, seconds, fx);
    }
    for (const fx of r.fx.night) {
      if (night <= 0.01) break;
      ctx.globalAlpha = alpha * night;
      this.front(ctx, w, h, seconds, fx);
    }
    ctx.restore();
  }

  /** Sky gradient, twinkling stars, and the sun (day) or a crescent moon (night) with its glow. */
  private sky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, night: number, mx: number, my: number, scroll: number) {
    const { sky, sun } = this.region;
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    g.addColorStop(0, mixHex(sky.day[0], sky.night[0], night));
    g.addColorStop(1, mixHex(sky.day[1], sky.night[1], night));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    if (night > 0.01) {
      for (const [x, y, s, phase] of this.stars) {
        ctx.fillStyle = `rgba(255,255,255,${night * (0.35 + 0.35 * Math.sin(t * 1.3 + phase))})`;
        ctx.fillRect(x * w, y * h - scroll * 0.02, s, s);
      }
    }

    const cx = sun[0] * w + mx * 12;
    const cy = sun[1] * h + my * 8 - scroll * 0.03;
    const size = Math.min(w, h);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.32);
    glow.addColorStop(0, night > 0.5 ? `rgba(220,230,255,${0.28 * night})` : `rgba(255,236,190,${0.55 * (1 - night)})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = night > 0.5 ? `rgba(236,240,250,${night})` : `rgba(255,248,226,${1 - night})`;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
    if (night > 0.5) {
      // Bite out of the disc → crescent moon
      ctx.fillStyle = mixHex(sky.day[1], sky.night[1], night);
      ctx.beginPath();
      ctx.arc(cx + size * 0.014, cy - size * 0.008, size * 0.03, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** One land layer: the ridge silhouette, snow caps, then its details. */
  private land(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, layer: Land, height: (x: number) => number, night: number, dx: number, dy: number) {
    const base = layer.base * h + dy;
    const amp = layer.amp * h;
    const ridge: Ridge = [];
    ctx.beginPath();
    ctx.moveTo(-PAD + dx, h + 400);
    for (let x = -PAD; x <= w + PAD; x += 6) {
      const y = base - height((x - dx) / w + layer.seed) * amp;
      ridge.push([x + dx, y]);
      ctx.lineTo(x + dx, y);
    }
    ctx.lineTo(w + PAD + dx, h + 400);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, base - amp, 0, base + h * 0.25);
    fill.addColorStop(0, mixHex(layer.day, layer.night, night));
    fill.addColorStop(1, mixHex(layer.day, layer.night, Math.min(1, night + 0.25)));
    ctx.fillStyle = fill;
    ctx.fill();
    if (layer.shape !== 'flat') this.shade(ctx, w, h, layer, height, night, base, amp, dx);

    if (layer.snow) {
      // White fading down from the highest peaks, clipped to the silhouette
      ctx.save();
      ctx.clip();
      const sg = ctx.createLinearGradient(0, base - amp, 0, base - amp * (1 - layer.snow));
      sg.addColorStop(0, `rgba(255,255,255,${0.95 - night * 0.45})`);
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(-PAD, base - amp - 10, w + PAD * 2, amp);
      ctx.restore();
    }
    if (layer.deco) this.details(ctx, w, h, t, layer, ridge, night, base, amp, dx);
    for (const { kind, at } of layer.landmarks ?? []) {
      const [x, y] = ridge[clamp(Math.round(at * (ridge.length - 1)), 0, ridge.length - 1)];
      this.landmark(ctx, kind, x, y, h, t, night, mixHex(layer.day, layer.night, Math.min(1, night + 0.45)));
    }
  }

  /**
   * Light and shade: slopes facing the sun keep their colour, slopes facing away darken.
   * Trick: inside the silhouette, paint a copy of it shifted away from the sun — every
   * point it covers is in shade, and the thin rims it leaves uncovered are the lit faces.
   */
  private shade(ctx: CanvasRenderingContext2D, w: number, h: number, layer: Land, height: (x: number) => number, night: number, base: number, amp: number, dx: number) {
    const away = this.region.sun[0] > 0.5 ? -1 : 1; // shift left when the sun is on the right
    const shift = Math.max(6, amp * 0.07) * away;
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-PAD + dx + shift, h + 400);
    for (let x = -PAD; x <= w + PAD; x += 6) ctx.lineTo(x + dx + shift, base - height((x - dx) / w + layer.seed) * amp + amp * 0.05);
    ctx.lineTo(w + PAD + dx + shift, h + 400);
    ctx.closePath();
    ctx.fillStyle = `rgba(10,14,28,${0.16 + night * 0.08})`;
    ctx.fill();
    ctx.restore();
  }

  /** Aerial perspective: veil everything up to this ridge in the horizon colour, so far ridges fade. */
  private haze(ctx: CanvasRenderingContext2D, w: number, h: number, layer: Layer, night: number, dy: number) {
    if (layer.kind !== 'land') return;
    const alpha = Math.max(0, 0.26 - layer.depth * 0.62) * (1 - night * 0.4);
    if (alpha <= 0) return;
    const top = (layer.base - layer.amp) * h + dy;
    const { sky } = this.region;
    // Fade in from nothing above the ridge, so the veil never shows an edge in the sky
    const g = ctx.createLinearGradient(0, top, 0, h);
    g.addColorStop(0, mixHex(sky.day[1], sky.night[1], night, 0));
    g.addColorStop(Math.min(0.5, (layer.amp * h) / Math.max(1, h - top)), mixHex(sky.day[1], sky.night[1], night, alpha));
    g.addColorStop(1, mixHex(sky.day[1], sky.night[1], night, alpha * 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(0, top, w, h - top);
  }

  /** Signature landmarks, standing on the ridge at (x, y). Sizes follow the screen height. */
  private landmark(ctx: CanvasRenderingContext2D, kind: LandmarkKind, x: number, y: number, h: number, t: number, night: number, dark: string) {
    const u = h / 900; // one "unit" ≈ 1px on a 900px-tall screen
    const lit = `rgba(255,196,110,${0.35 + night * 0.6})`;
    ctx.save();
    ctx.fillStyle = dark;
    switch (kind) {
      case 'shrine': {
        // Badrinath-style temple: painted facade, stepped roofs, golden finial, saffron flag
        const W = 46 * u;
        const H = 30 * u;
        ctx.fillStyle = mixHex('#c4453c', '#3a1620', night);
        ctx.fillRect(x - W / 2, y - H, W, H + 6 * u);
        ctx.fillStyle = mixHex('#e8b04b', '#6b4a1c', night);
        for (let k = 0; k < 4; k++) ctx.fillRect(x - W / 2 + 4 * u + k * 11 * u, y - H + 5 * u, 6 * u, 12 * u);
        ctx.fillStyle = mixHex('#2f5e8f', '#16243d', night);
        for (const [rw, ry] of [[1.25, 0], [0.9, 9], [0.55, 17]]) {
          ctx.beginPath();
          ctx.moveTo(x - (W / 2) * rw, y - H - ry * u);
          ctx.lineTo(x, y - H - (ry + 10) * u);
          ctx.lineTo(x + (W / 2) * rw, y - H - ry * u);
          ctx.fill();
        }
        ctx.fillStyle = '#e8b04b';
        ctx.fillRect(x - 1.5 * u, y - H - 36 * u, 3 * u, 10 * u);
        ctx.fillStyle = '#e8742a';
        ctx.beginPath();
        ctx.moveTo(x + 1.5 * u, y - H - 36 * u);
        ctx.lineTo(x + (13 + Math.sin(t * 3) * 2) * u, y - H - 32 * u);
        ctx.lineTo(x + 1.5 * u, y - H - 28 * u);
        ctx.fill();
        if (night > 0.2) {
          ctx.fillStyle = lit;
          ctx.fillRect(x - 4 * u, y - 12 * u, 8 * u, 12 * u);
        }
        break;
      }
      case 'flags': {
        // Prayer flags strung between two poles, fluttering
        const span = 150 * u;
        ctx.fillRect(x - span / 2, y - 46 * u, 2 * u, 46 * u);
        ctx.fillRect(x + span / 2, y - 40 * u, 2 * u, 40 * u);
        const colours = ['#2f6fb3', '#f2f0e8', '#c63a32', '#3f8f4a', '#e8b93b'];
        /** Point on the sagging string, f = 0…1 along it. */
        const along = (f: number): [number, number] => [x - span / 2 + f * span, y - 46 * u + f * 6 * u + Math.sin(f * Math.PI) * 18 * u];
        ctx.strokeStyle = dark;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let k = 0; k <= 20; k++) {
          const [px, py] = along(k / 20);
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha *= 0.9 - night * 0.45;
        for (let k = 1; k < 20; k++) {
          const [px, py] = along(k / 20);
          ctx.fillStyle = colours[k % 5];
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.sin(t * 4 + k) * 0.18);
          ctx.fillRect(-3 * u, 0, 6 * u, 8 * u);
          ctx.restore();
        }
        break;
      }
      case 'chhatri': {
        // Rajput cenotaph: plinth, four pillars, a dome with a finial
        const W = 40 * u;
        ctx.fillRect(x - W / 2 - 4 * u, y - 6 * u, W + 8 * u, 8 * u);
        for (const p of [-0.45, -0.15, 0.15, 0.45]) ctx.fillRect(x + p * W - 2 * u, y - 30 * u, 4 * u, 24 * u);
        ctx.fillRect(x - W / 2 - 3 * u, y - 34 * u, W + 6 * u, 5 * u);
        ctx.beginPath();
        ctx.ellipse(x, y - 34 * u, W * 0.42, 18 * u, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x - 1 * u, y - 60 * u, 2 * u, 9 * u);
        break;
      }
      case 'gopuram': {
        // Hampi-style temple tower: tiers narrowing upward, a barrel-vault crown
        const W = 54 * u;
        for (let k = 0; k < 7; k++) {
          const tw = W * (1 - k * 0.11);
          ctx.fillStyle = dark;
          ctx.fillRect(x - tw / 2, y - (k + 1) * 11 * u, tw, 12 * u);
          ctx.fillStyle = `rgba(255,255,255,${0.12 - night * 0.08})`;
          ctx.fillRect(x - tw / 2, y - (k + 1) * 11 * u, tw, 2 * u);
        }
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.ellipse(x, y - 78 * u, W * 0.2, 7 * u, 0, Math.PI, 0);
        ctx.fill();
        if (night > 0.2) {
          ctx.fillStyle = lit;
          ctx.fillRect(x - 4 * u, y - 14 * u, 8 * u, 14 * u);
        }
        break;
      }
      case 'monastery': {
        // Hill monastery: whitewashed walls, a maroon band, sweeping roofs, a golden spire
        const W = 60 * u;
        ctx.fillStyle = mixHex('#efe9dc', '#2a2f3a', night);
        ctx.fillRect(x - W / 2, y - 22 * u, W, 24 * u);
        ctx.fillStyle = mixHex('#8e2f2f', '#2a1418', night);
        ctx.fillRect(x - W / 2, y - 26 * u, W, 5 * u);
        for (const [rw, ry] of [[1.2, 26], [0.8, 38]]) {
          ctx.beginPath();
          ctx.moveTo(x - (W / 2) * rw, y - ry * u);
          ctx.quadraticCurveTo(x, y - (ry + 18) * u, x + (W / 2) * rw, y - ry * u);
          ctx.fill();
        }
        ctx.fillStyle = '#e8b04b';
        ctx.fillRect(x - 1.5 * u, y - 66 * u, 3 * u, 14 * u);
        ctx.fillStyle = night > 0.2 ? lit : mixHex('#5a3a2a', '#141a22', night);
        for (let k = 0; k < 5; k++) ctx.fillRect(x - W / 2 + 6 * u + k * 11 * u, y - 16 * u, 5 * u, 8 * u);
        break;
      }
      case 'lighthouse': {
        // A coastal lighthouse; at night its beam sweeps across the sea
        ctx.fillStyle = mixHex('#f4efe6', '#3a4256', night);
        ctx.beginPath();
        ctx.moveTo(x - 7 * u, y);
        ctx.lineTo(x - 4 * u, y - 52 * u);
        ctx.lineTo(x + 4 * u, y - 52 * u);
        ctx.lineTo(x + 7 * u, y);
        ctx.fill();
        ctx.fillStyle = mixHex('#c4453c', '#4a1a1e', night);
        ctx.fillRect(x - 5.5 * u, y - 22 * u, 11 * u, 6 * u);
        ctx.fillRect(x - 5 * u, y - 60 * u, 10 * u, 8 * u);
        if (night > 0.2) {
          const reach = Math.sin(t * 0.8) * 600 * u;
          const beam = ctx.createLinearGradient(x, 0, x + reach, 0);
          beam.addColorStop(0, `rgba(255,235,180,${0.4 * night})`);
          beam.addColorStop(1, 'rgba(255,235,180,0)');
          ctx.fillStyle = beam;
          ctx.beginPath();
          ctx.moveTo(x, y - 56 * u);
          ctx.lineTo(x + reach, y - 86 * u);
          ctx.lineTo(x + reach, y - 26 * u);
          ctx.fill();
        }
        break;
      }
    }
    ctx.restore();
  }


  /** Drifting bands of mist: soft ellipses sliding sideways. */
  private mist(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, layer: Extract<Layer, { kind: 'mist' }>, night: number, dx: number, dy: number) {
    for (let k = 0; k < 5; k++) {
      const x = ((k * 0.27 + ((t * layer.speed) / w) * 12) % 1.4 - 0.2) * w + dx;
      const y = layer.y * h + dy + Math.sin(t * 0.2 + k) * 10;
      const rx = w * 0.38;
      const ry = h * 0.07;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
      g.addColorStop(0, mixHex(layer.day, layer.night, night, layer.alpha));
      g.addColorStop(1, mixHex(layer.day, layer.night, night, 0));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      ctx.translate(-x, -y);
      ctx.fillStyle = g;
      ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      ctx.restore();
    }
  }

  /** River or sea: gradient water, moving ripples, the sun/moon path, and breaking waves at sea. */
  private water(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, layer: Extract<Layer, { kind: 'water' }>, night: number, dx: number, dy: number) {
    const y0 = layer.base * h + dy;
    const g = ctx.createLinearGradient(0, y0, 0, h);
    g.addColorStop(0, mixHex(layer.day[0], layer.night[0], night));
    g.addColorStop(1, mixHex(layer.day[1], layer.night[1], night));
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, w, h - y0 + 400);

    // Ripples: closer ones are longer and faster
    ctx.strokeStyle = `rgba(255,255,255,${0.22 - night * 0.1})`;
    ctx.lineWidth = 1;
    for (let k = 0; k < 26; k++) {
      const depth = k / 26;
      const y = y0 + Math.pow(depth, 1.6) * (h - y0) + 4;
      const len = 20 + depth * 90;
      const speed = 8 + depth * 40;
      for (let j = 0; j < 6; j++) {
        const x = ((j * 211 + k * 97 + t * speed) % (w + 200)) - 100 + dx * depth;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len / 2, y - 2 - depth * 3, x + len, y);
        ctx.stroke();
      }
    }

    // Shimmering path of light under the sun or moon
    const sx = this.region.sun[0] * w;
    const path = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
    path.addColorStop(0, 'rgba(255,255,255,0)');
    path.addColorStop(0.5, night > 0.5 ? 'rgba(220,230,255,.18)' : 'rgba(255,230,180,.35)');
    path.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = path;
    for (let k = 0; k < 18; k++) {
      const yy = y0 + (k * (h - y0)) / 18;
      const width = 30 + k * 6 + Math.sin(t * 2 + k) * 8;
      ctx.fillRect(sx - width / 2, yy, width, 2);
    }

    if (layer.sea) {
      // Three wave lines rolling up the beach and fading
      ctx.strokeStyle = `rgba(255,255,255,${0.6 - night * 0.3})`;
      ctx.lineWidth = 2;
      const baseAlpha = ctx.globalAlpha;
      for (let k = 0; k < 3; k++) {
        const phase = (t * 0.25 + k / 3) % 1;
        const y = lerp(h * 0.78, h * 0.89, phase) + dy * 0.4;
        ctx.globalAlpha = baseAlpha * (1 - phase) * 0.8;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.012 + k * 2 + t) * 4);
        ctx.stroke();
      }
      ctx.globalAlpha = baseAlpha;
    }
  }

  /** The details that make a layer a place. */
  private details(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, layer: Land, ridge: Ridge, night: number, base: number, amp: number, dx: number) {
    const dark = mixHex(layer.day, layer.night, Math.min(1, night + 0.35));
    /** Ridge point at a fraction across the screen. */
    const at = (f: number) => ridge[clamp(Math.round(f * (ridge.length - 1)), 0, ridge.length - 1)];
    ctx.fillStyle = dark;
    ctx.strokeStyle = dark;

    switch (layer.deco) {
      case 'pines':
      case 'canopy': {
        // Little pine triangles or round tree crowns all along the ridge
        // Varied trees: sizes and shades differ, with natural gaps (seeded, so they never shuffle)
        const lighter = mixHex(layer.day, layer.night, Math.min(1, night + 0.15));
        for (let i = 0; i < ridge.length; i += 2) {
          const r = Math.abs(Math.sin(i * 12.9898 + layer.seed * 78.233)) % 1;
          if (r < 0.18) continue;
          const [x, y] = ridge[i];
          const size = (layer.deco === 'pines' ? 16 : 11) * (1 + layer.depth * 2) * (0.55 + r * 0.75);
          ctx.fillStyle = r > 0.6 ? lighter : dark;
          if (layer.deco === 'pines') {
            // A pine in three tiers on a short trunk
            ctx.fillRect(x - 0.6, y - size * 0.15, 1.2, size * 0.2);
            for (let k = 0; k < 3; k++) {
              const tierW = size * (0.4 - k * 0.09);
              const tierY = y - size * 0.12 - k * size * 0.26;
              ctx.beginPath();
              ctx.moveTo(x - tierW, tierY);
              ctx.lineTo(x, tierY - size * 0.42);
              ctx.lineTo(x + tierW, tierY);
              ctx.fill();
            }
          } else {
            // A rounded crown made of three overlapping circles
            for (const [ox, oy, rr] of [[-0.35, 0, 0.42], [0.35, 0, 0.4], [0, -0.32, 0.48]]) {
              ctx.beginPath();
              ctx.arc(x + ox * size, y + oy * size, rr * size, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.fillStyle = dark;

        break;
      }
      case 'temples': {
        // The ghats' skyline: houses, shikhara spires with saffron flags, lit windows at night, steps
        for (let i = 0; i < 26; i++) {
          const [x, y] = at(i / 26 + 0.01);
          const bw = 22 + ((i * 53) % 30);
          const bh = 20 + ((i * 71) % 50);
          ctx.fillRect(x, y - bh, bw, bh + 40);
          if (i % 4 === 1) {
            const spire = 40 + ((i * 13) % 30);
            const top = y - bh - spire;
            ctx.beginPath();
            ctx.moveTo(x + 2, y - bh);
            ctx.quadraticCurveTo(x + bw / 2 - 6, y - bh - spire * 0.4, x + bw / 2, top);
            ctx.quadraticCurveTo(x + bw / 2 + 6, y - bh - spire * 0.4, x + bw - 2, y - bh);
            ctx.fill();
            ctx.fillRect(x + bw / 2 - 0.5, top - 12, 1.2, 12);
            ctx.fillStyle = mixHex('#e8742a', '#ffb347', night);
            ctx.beginPath();
            ctx.moveTo(x + bw / 2, top - 12);
            ctx.lineTo(x + bw / 2 + 9 + Math.sin(t * 3 + i) * 2, top - 9);
            ctx.lineTo(x + bw / 2, top - 6);
            ctx.fill();
            ctx.fillStyle = dark;
          }
          if (night > 0.2) {
            ctx.fillStyle = `rgba(255,190,90,${night * 0.8})`;
            for (let k = 0; k < 3; k++) ctx.fillRect(x + 4 + k * 6, y - bh + 8 + (i % 3) * 6, 2.5, 3.5);
            ctx.fillStyle = dark;
          }
        }
        ctx.fillStyle = mixHex('#b98e6e', '#1e1424', night);
        for (let k = 0; k < 4; k++) ctx.fillRect(0, base + 6 + k * 5, w, 2.5);
        break;
      }
      case 'fort': {
        // A golden fort on the far dunes: wall, battlements, domed bastions
        const [x, y] = at(0.24);
        const fw = w * 0.16;
        const fh = h * 0.05;
        ctx.fillRect(x, y - fh, fw, fh + 20);
        for (let k = 0; k <= 10; k++) ctx.fillRect(x + (k * fw) / 10 - 3, y - fh - 6, 6, 6);
        for (const p of [0, 0.33, 0.66, 1]) {
          ctx.fillRect(x + p * fw - 9, y - fh * 1.6, 18, fh * 1.6);
          ctx.beginPath();
          ctx.arc(x + p * fw, y - fh * 1.6, 9, Math.PI, 0);
          ctx.fill();
        }
        break;
      }
      case 'camels': {
        // A small caravan crossing the dune crest, legs stepping
        const scale = Math.min(1, w / 1200);
        for (const [f, s] of [[0.62, 1], [0.66, 0.9], [0.7, 0.95]]) {
          const [x0, y0] = at((f + t * 0.004) % 1);
          const sc = 16 * s * scale;
          ctx.beginPath();
          ctx.ellipse(x0, y0 - sc * 1.6, sc * 1.1, sc * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x0 - sc * 0.2, y0 - sc * 2.05, sc * 0.45, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x0 + sc * 0.9, y0 - sc * 2.6, sc * 0.25, sc * 1.1);
          ctx.fillRect(x0 + sc * 0.9, y0 - sc * 2.7, sc * 0.55, sc * 0.3);
          for (const lx of [-0.8, -0.4, 0.3, 0.7]) ctx.fillRect(x0 + lx * sc, y0 - sc * 1.2, sc * 0.14, sc * 1.25 + Math.sin(t * 4 + lx * 5) * 1.5);
        }
        break;
      }
      case 'ruins': {
        // Pillared mandapas with a small tower, on the plateau
        for (const f of [0.18, 0.55]) {
          const [x, y] = at(f);
          const rw = w * 0.09;
          const rh = h * 0.06;
          ctx.fillRect(x - 6, y - rh - 8, rw + 12, 8);
          ctx.fillRect(x - 10, y - rh - 14, rw + 20, 6);
          for (let k = 0; k <= 5; k++) ctx.fillRect(x + (k * rw) / 5 - 3, y - rh, 6, rh + 12);
          ctx.beginPath();
          ctx.moveTo(x + rw * 0.2, y - rh - 14);
          ctx.lineTo(x + rw * 0.5, y - rh - 44);
          ctx.lineTo(x + rw * 0.8, y - rh - 14);
          ctx.fill();
        }
        break;
      }
      case 'boulders': {
        // Hampi-style stacked boulders along the ridge
        for (let i = 3; i < ridge.length; i += 11) {
          const [x, y] = ridge[i];
          const s = (8 + ((i * 29) % 14)) * (1 + layer.depth * 2);
          ctx.beginPath();
          ctx.ellipse(x, y, s * 1.2, s, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + s * 0.9, y - s * 0.9, s * 0.8, s * 0.7, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'falls': {
        // Waterfalls streaming down the ridge (animated dashes)
        ctx.strokeStyle = `rgba(255,255,255,${0.75 - night * 0.45})`;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -t * 60;
        for (const f of [0.3, 0.47, 0.71]) {
          const [x, y] = at(f);
          ctx.beginPath();
          ctx.moveTo(x, y + 4);
          ctx.lineTo(x + 2, y + amp * 0.9);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 8);
          ctx.lineTo(x + 7, y + amp * 0.85);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        break;
      }
      case 'terraces': {
        // Tea-garden terraces: contour lines following the hill, clipped to it
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ridge[0][0], h + 400);
        ridge.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.lineTo(ridge[ridge.length - 1][0], h + 400);
        ctx.clip();
        ctx.strokeStyle = `rgba(255,255,255,${0.16 - night * 0.1})`;
        ctx.lineWidth = 1.2;
        for (let k = 0; k < 18; k++) {
          ctx.beginPath();
          ridge.forEach(([x, y], i) => {
            const yy = y + 8 + k * 9 + Math.sin(i * 0.2 + k) * 2;
            if (i) ctx.lineTo(x, yy);
            else ctx.moveTo(x, yy);
          });
          ctx.stroke();
        }
        ctx.restore();
        break;
      }
      case 'palms': {
        // Coconut palms at the right edge (clear of the page's text), fronds swaying
        ctx.strokeStyle = mixHex('#3b2a1e', '#05080d', night);
        ctx.lineCap = 'round';
        for (const [px, lean, height] of [[0.9, -0.16, 0.64], [0.97, 0.08, 0.5]]) {
          const x0 = px * w + dx * 1.2;
          const y0 = h + 10;
          const x1 = x0 + lean * w * 0.5;
          const y1 = h - height * h;
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(x0 + lean * w * 0.1, (y0 + y1) / 2, x1, y1);
          ctx.stroke();
          ctx.lineWidth = 7;
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2 + Math.sin(t * 0.8 + k) * 0.06;
            const len = 90 + (k % 3) * 25;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(x1 + Math.cos(a) * len * 0.6, y1 + Math.sin(a) * len * 0.3 - 30, x1 + Math.cos(a) * len, y1 + Math.sin(a) * len * 0.45 + 20);
            ctx.stroke();
          }
        }
        break;
      }
    }
  }

  /** Birds (gliding, wings flapping) and kites (Gangetic Plains) in the day sky. */
  private skyLife(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scroll: number) {
    const fx = this.region.fx.day;
    ctx.strokeStyle = 'rgba(30,30,40,.55)';
    ctx.lineWidth = 1.6;
    if (fx.includes('birds')) {
      for (const [x0, y0, speed, phase] of this.birds) {
        const x = (((x0 + t * speed * 0.012) % 1.2) - 0.1) * w;
        const y = y0 * h + Math.sin(t * 0.6 + phase) * 12 - scroll * 0.05;
        const wing = Math.sin(t * 6 + phase) * 4;
        ctx.beginPath();
        ctx.moveTo(x - 8, y - wing);
        ctx.quadraticCurveTo(x - 3, y - 2, x, y);
        ctx.quadraticCurveTo(x + 3, y - 2, x + 8, y - wing);
        ctx.stroke();
      }
    }
    if (fx.includes('kites')) {
      const colours = ['#e2483c', '#f2a93b', '#3c8dd8', '#d94f9a'];
      for (const [x0, y0, phase, c] of this.kites) {
        const x = x0 * w + Math.sin(t * 0.7 + phase) * 18;
        const y = y0 * h + Math.cos(t * 0.9 + phase) * 10 - scroll * 0.05;
        const s = 14;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(t + phase) * 0.25);
        ctx.fillStyle = colours[c];
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.8, 0);
        ctx.lineTo(0, s * 1.1);
        ctx.lineTo(-s * 0.8, 0);
        ctx.fill();
        // Fluttering tail
        ctx.strokeStyle = 'rgba(40,30,30,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, s * 1.1);
        for (let k = 1; k < 8; k++) ctx.lineTo(Math.sin(t * 3 + k + phase) * 4, s * 1.1 + k * 6);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /** Weather and life drawn in front of the land. */
  private front(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, fx: Fx) {
    switch (fx) {
      case 'snow':
        ctx.fillStyle = '#fff';
        for (const [x0, y0, s, phase] of this.snow) {
          const x = ((x0 + Math.sin(t * 0.4 + phase * 6) * 0.02 + t * 0.006) % 1) * w;
          const y = ((y0 + t * 0.02 * s) % 1) * h;
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'rain':
        ctx.strokeStyle = 'rgba(220,235,240,.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [x0, y0, s] of this.rain) {
          const y = ((y0 + t * 1.1 * s) % 1) * h;
          const x = ((x0 + t * 0.08) % 1) * w;
          ctx.moveTo(x, y);
          ctx.lineTo(x - 5, y + 16 * s);
        }
        ctx.stroke();
        break;
      case 'fireflies':
        for (const [x0, y0, a, b] of this.flies) {
          const x = (x0 + Math.sin(t * 0.3 + a) * 0.03) * w;
          const y = (y0 + Math.cos(t * 0.25 + b) * 0.03) * h;
          const glow = 0.5 + 0.5 * Math.sin(t * 3 + a * 3);
          const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
          g.addColorStop(0, `rgba(230,255,140,${glow})`);
          g.addColorStop(1, 'rgba(230,255,140,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - 8, y - 8, 16, 16);
        }
        break;
      case 'diyas':
        // Floating lamps drifting downstream, flames flickering, light trailing on the water
        for (const [x0, y0, phase] of this.diyas) {
          const x = ((x0 + t * 0.006) % 1) * w;
          const y = y0 * h + Math.sin(t * 1.5 + phase) * 2;
          const flicker = 0.75 + 0.25 * Math.sin(t * 9 + phase * 4);
          const g = ctx.createRadialGradient(x, y, 0, x, y, 14 * flicker);
          g.addColorStop(0, 'rgba(255,200,90,.95)');
          g.addColorStop(0.3, 'rgba(255,150,40,.45)');
          g.addColorStop(1, 'rgba(255,120,20,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - 16, y - 16, 32, 32);
          ctx.fillStyle = 'rgba(255,170,60,.25)';
          ctx.fillRect(x - 1, y + 3, 2, 12 * flicker);
        }
        break;
      case 'boats':
        ctx.fillStyle = 'rgba(40,24,20,.85)';
        for (const [x0, y0, s] of this.boats) {
          const x = (((x0 + t * 0.004 * s) % 1.2) - 0.1) * w;
          const y = y0 * h + Math.sin(t + x0 * 9) * 1.5;
          const len = 70 * s;
          ctx.beginPath();
          ctx.moveTo(x - len / 2, y);
          ctx.quadraticCurveTo(x, y + 12 * s, x + len / 2, y - 4);
          ctx.lineTo(x - len / 2, y);
          ctx.fill();
          ctx.fillRect(x - 2, y - 26 * s, 2, 26 * s);
        }
        break;
      case 'houseboat': {
        // A Kerala houseboat drifting slowly across the water, windows glowing
        const u = h / 900;
        const x = (((0.3 + t * 0.003) % 1.3) - 0.15) * w;
        const y = h * 0.74 + Math.sin(t * 0.9) * 1.5;
        ctx.fillStyle = 'rgba(58,36,24,.92)';
        ctx.beginPath();
        ctx.moveTo(x - 70 * u, y - 6 * u);
        ctx.quadraticCurveTo(x, y + 14 * u, x + 70 * u, y - 10 * u);
        ctx.lineTo(x - 70 * u, y - 6 * u);
        ctx.fill();
        ctx.fillStyle = 'rgba(196,160,104,.95)';
        ctx.beginPath();
        ctx.moveTo(x - 58 * u, y - 6 * u);
        ctx.quadraticCurveTo(x - 50 * u, y - 34 * u, x, y - 36 * u);
        ctx.quadraticCurveTo(x + 50 * u, y - 34 * u, x + 58 * u, y - 8 * u);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,110,.85)';
        for (let k = 0; k < 5; k++) ctx.fillRect(x - 36 * u + k * 16 * u, y - 20 * u, 8 * u, 7 * u);
        break;
      }
      case 'glitter':

        // Sparkles on the sea, blinking in and out
        for (let i = 0; i < 60; i++) {
          const x = ((i * 0.618 + Math.floor(t * 2 + i) * 0.37) % 1) * w;
          const y = h * (0.62 + ((i * 0.41) % 1) * 0.25);
          const a = Math.max(0, Math.sin(t * 5 + i * 3));
          ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
          ctx.fillRect(x, y, 2.4, 1.2);
        }
        break;
      default:
        // Birds, kites and stars are drawn with the sky
        break;
    }
  }

  /** Blowing sand: fine grains streaming sideways across the dunes. */
  private blowingSand(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, alpha: number) {
    ctx.fillStyle = `rgba(255,236,200,${0.55 * alpha})`;
    for (const [x0, y0, s, phase] of this.sand) {
      const x = ((x0 + t * 0.06 * s) % 1) * w;
      const y = y0 * h + Math.sin(t * 2 + phase * 9) * 6;
      ctx.fillRect(x, y, 1.6 * s + 1, 1);
    }
  }
}
