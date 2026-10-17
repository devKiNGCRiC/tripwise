/**
 * liquidShader.ts — the GLSL for TripWise's "living liquid colour".
 *
 * A domain-warped fractal noise field (noise feeding noise feeding noise) makes slow,
 * marbled currents. Two palettes are blended by `night` (0 = dawn, 1 = monsoon), so a
 * theme switch makes the colours flow into each other instead of snapping.
 * Up to six ripples (x, y, startTime) bend the currents where the visitor taps or moves.
 */

/** Vertex shader: one full-screen triangle; passes 0–1 coordinates to the fragment shader. */
export const LIQUID_VERTEX = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/** How many ripples can be alive at once (ring buffer size). */
export const MAX_RIPPLES = 6;

/** Fragment shader: the colour field itself (see file header). */
export const LIQUID_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float t;          // seconds since start
uniform float night;      // 0 = dawn palette, 1 = monsoon palette
uniform vec2 res;         // drawing size in px (for aspect ratio)
uniform vec2 pointer;     // last pointer position, 0–1
uniform vec3 ripples[${MAX_RIPPLES}]; // x, y (0–1) and start time

// Gradient noise helpers
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
// Fractal noise: five octaves of detail
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.02; a *= 0.5; }
  return s;
}

void main() {
  vec2 aspect = vec2(res.x / res.y, 1.0);
  vec2 p = (vUv - 0.5) * aspect * 2.0;

  // Ripples: expanding rings that fade with distance and age
  float rip = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec3 r = ripples[i];
    float age = t - r.z;
    if (age < 0.0 || age > 3.0) continue;
    float d = length((vUv - r.xy) * aspect);
    rip += sin(d * 38.0 - age * 9.0) * exp(-d * 4.0) * exp(-age * 1.4) * 0.05;
  }

  // Domain warping: q bends p, r bends q, f is the final current
  vec2 q = vec2(fbm(p + t * 0.04), fbm(p + vec2(5.2, 1.3) - t * 0.035));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.05 + rip * 4.0), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.04));
  float f = fbm(p + 3.5 * r + rip * 6.0);

  // Dawn: ivory, peach, soft teal, saffron light
  vec3 dawn = mix(vec3(0.965, 0.937, 0.89), vec3(0.98, 0.80, 0.66), smoothstep(-0.25, 0.45, f));
  dawn = mix(dawn, vec3(0.55, 0.78, 0.76), smoothstep(0.3, 0.75, length(r)) * 0.55);
  dawn = mix(dawn, vec3(0.93, 0.64, 0.30), smoothstep(0.6, 1.0, f + length(q) * 0.3) * 0.45);

  // Monsoon: indigo, rain teal, sky, marigold
  vec3 mon = mix(vec3(0.04, 0.07, 0.19), vec3(0.03, 0.36, 0.42), smoothstep(-0.3, 0.4, f));
  mon = mix(mon, vec3(0.3, 0.62, 0.78), smoothstep(0.3, 0.7, length(r)) * 0.5);
  mon = mix(mon, vec3(0.95, 0.62, 0.25), smoothstep(0.58, 0.95, f + length(q) * 0.3) * 0.7);

  vec3 col = mix(dawn, mon, night) + rip * mix(1.2, 2.2, night);
  // At night, a soft lantern-light follows the pointer
  col *= mix(1.0, 0.82 + 0.3 * smoothstep(1.4, 0.0, length((vUv - pointer) * aspect)), night);
  gl_FragColor = vec4(col, 1.0);
}`;
