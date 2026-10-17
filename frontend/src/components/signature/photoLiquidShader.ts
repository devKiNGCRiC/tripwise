/**
 * photoLiquidShader.ts — GLSL that turns a photograph into water.
 *
 * The photo is drawn "cover"-fitted with a slow Ken Burns zoom, and its pixels are
 * gently displaced by flowing noise (a living shimmer) and by ripples where the visitor
 * taps or moves. Changing places doesn't cut: the next photo pours in behind a noisy,
 * liquid front that warps the image as it passes. A colour grade blends from warm dawn
 * (night = 0) to monsoon indigo with a lantern glow at the pointer (night = 1).
 */
import { MAX_RIPPLES } from './liquidShader';

/** Fragment shader (pairs with LIQUID_VERTEX's full-screen triangle). */
export const PHOTO_LIQUID_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D fromTex;   // photo being left
uniform sampler2D toTex;     // photo arriving (same as fromTex when settled)
uniform vec2 fromSize;       // photo sizes in px, for cover-fitting
uniform vec2 toSize;
uniform float fromAge;       // seconds each photo has been on screen (Ken Burns)
uniform float toAge;
uniform float progress;      // 0 → 1 transition from 'from' to 'to'
uniform float t;             // seconds since start
uniform float night;         // 0 = dawn grade, 1 = monsoon grade
uniform vec2 res;            // drawing size in px
uniform vec2 pointer;        // 0–1, y up
uniform vec3 ripples[${MAX_RIPPLES}];

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash(i), f), dot(hash(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

// Map screen uv to photo uv: cover-fit, centred, with a slow zoom that settles over ~10s.
vec2 coverUv(vec2 uv, vec2 size, float age) {
  float s = max(res.x / size.x, res.y / size.y);
  vec2 scaled = size * s;
  float zoom = 1.1 - 0.07 * smoothstep(0.0, 10.0, age);
  vec2 p = (uv * res - 0.5 * res) / scaled / zoom + 0.5;
  return vec2(p.x, 1.0 - p.y); // images are stored top-down
}

void main() {
  vec2 aspect = vec2(res.x / res.y, 1.0);
  vec2 uv = vUv;

  // A living shimmer, like light on water
  vec2 flow = vec2(fbm(uv * 3.0 + t * 0.06), fbm(uv * 3.0 + vec2(4.1, 2.7) - t * 0.05));
  uv += (flow - 0.5) * 0.012;

  // Ripples push pixels outward in rings
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec3 r = ripples[i];
    float age = t - r.z;
    if (age < 0.0 || age > 3.0) continue;
    vec2 d = (vUv - r.xy) * aspect;
    float dist = length(d);
    float wave = sin(dist * 42.0 - age * 9.0) * exp(-dist * 5.0) * exp(-age * 1.3);
    uv += normalize(d + 1e-5) / aspect * wave * 0.012;
  }

  // The liquid front: a noisy diagonal that sweeps across as progress goes 0 → 1
  float front = (vUv.x * 0.8 + (1.0 - vUv.y) * 0.2) + fbm(vUv * 2.5 + t * 0.2) * 0.35;
  float edge = front - (progress * 1.7 - 0.35);
  float reveal = smoothstep(0.04, -0.04, edge);               // 1 where the new photo has arrived
  float wake = exp(-abs(edge) * 14.0) * (1.0 - step(1.0, progress)); // turbulence near the front
  vec2 warp = (flow - 0.5) * wake * 0.08;

  vec3 fromCol = texture2D(fromTex, coverUv(uv + warp, fromSize, fromAge)).rgb;
  vec3 toCol = texture2D(toTex, coverUv(uv - warp, toSize, toAge)).rgb;
  vec3 col = mix(fromCol, toCol, reveal);
  col += wake * 0.08; // a bright crest rides the front

  // Grades: dawn (warm, airy) and monsoon (indigo, moody) with a lantern at the pointer
  vec3 dawn = col * vec3(1.05, 1.0, 0.9) + vec3(0.04, 0.025, 0.0);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 mon = mix(vec3(luma), col, 0.55) * vec3(0.5, 0.62, 0.95) * 0.85 + vec3(0.01, 0.02, 0.07);
  float lantern = exp(-length((vUv - pointer) * aspect) * 4.5);
  mon += vec3(1.0, 0.66, 0.25) * lantern * 0.28;
  gl_FragColor = vec4(mix(dawn, mon, night), 1.0);
}`;
