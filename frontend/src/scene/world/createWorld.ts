/**
 * createWorld.ts — builds and runs the 3D world ("The Descent") on a canvas.
 *
 * One continuous landscape lit by ONE sun: a physically based sky, textured
 * terrain (Poly Haven photo detail, triplanar-mapped), a reflective river, a
 * waterfall with mist, a swaying pine forest, drifting clouds, and a night sky
 * with stars, a moon, northern lights, diyas on the river and fireflies.
 * A cinematic post-processing chain (bloom, ACES tone mapping, grade, vignette,
 * film grain) finishes the image.
 *
 * Plain TypeScript (no React) so it can be lazy-loaded as one chunk; WorldCanvas.tsx
 * drives it. Everything is disposed by `dispose()`.
 */
import gsap from 'gsap';
import {
  BlendFunction,
  BloomEffect,
  BrightnessContrastEffect,
  Effect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SceneTier } from '../quality';
import { cameraPose } from './camera';
import { CLIFF, height, riverX, WORLD } from './terrain';
import { startTerrainJob } from './terrainJob';

export interface WorldOptions {
  tier: SceneTier;
  night: boolean;
  /** false → no ambient animation (reduced motion); the scene still follows scroll. */
  motion: boolean;
}

export interface World {
  /** Scroll progress 0–1; the camera eases toward it. */
  setProgress(p: number): void;
  /** Sunset into night (or sunrise back to day) over ~3s. */
  setNight(night: boolean): void;
  /** Pointer position −0.5…0.5 for a gentle look-around. */
  setPointer(x: number, y: number): void;
  dispose(): void;
}

/** Average colour of each texture, so detail can be applied without shifting our palette. */
const TEXTURE_MEAN = {
  grass: [0.446, 0.381, 0.143],
  rock: [0.431, 0.363, 0.205],
  snow: [0.529, 0.527, 0.579],
  cliff: [0.486, 0.324, 0.194],
} as const;

/**
 * Exposure, applied to the HDR image before tone mapping. (Post-processing tone mapping
 * ignores the renderer's own exposure setting, so without this the world looks washed out.)
 */
class ExposureEffect extends Effect {
  constructor(exposure: number) {
    super(
      'ExposureEffect',
      'uniform float exposure; void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor){ outputColor = vec4(inputColor.rgb * exposure, inputColor.a); }',
      { uniforms: new Map([['exposure', new THREE.Uniform(exposure)]]) },
    );
  }
  set exposure(value: number) {
    this.uniforms.get('exposure')!.value = value;
  }
}

/** A high mid-morning sun: deep blue sky, little horizon glare. */
const DAY_ELEVATION = 34;

const DETAIL = {
  high: { pixelRatio: 1.5, shadows: true, reflection: 512 },
  low: { pixelRatio: 1, shadows: false, reflection: 256 },
} as const;

/** A soft round glow texture, drawn once (mist, diyas, fireflies, moon halo). */
function softTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/** A fluffy cloud texture: many soft overlapping puffs, flatter at the bottom like real cumulus. */
function cloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d')!;
  for (let i = 0; i < 70; i++) {
    const x = 70 + Math.random() * 372;
    const y = 110 + Math.random() * 70 - (Math.abs(x - 256) / 256) * 40;
    const r = 28 + Math.random() * 60;
    const gradient = g.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 512, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

/** A moon drawn with soft maria (the darker "seas"). */
function moonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  const gradient = g.createRadialGradient(118, 112, 10, 128, 128, 120);
  gradient.addColorStop(0, '#fffdf2');
  gradient.addColorStop(0.85, '#e4dfcf');
  gradient.addColorStop(1, 'rgba(228,223,207,0)');
  g.fillStyle = gradient;
  g.beginPath();
  g.arc(128, 128, 120, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(150,145,130,${0.08 + Math.random() * 0.14})`;
    g.beginPath();
    g.arc(50 + Math.random() * 156, 50 + Math.random() * 156, 4 + Math.random() * 18, 0, Math.PI * 2);
    g.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Load a repeating colour texture from /public/world. */
async function loadTexture(loader: THREE.TextureLoader, name: string, color = true): Promise<THREE.Texture> {
  const texture = await loader.loadAsync(`${import.meta.env.BASE_URL}world/${name}.jpg`);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Build the world. If anything fails part-way (e.g. shader compile on a weak GPU),
 * everything created so far is released before the error is passed on.
 */
export async function createWorld(canvas: HTMLCanvasElement, options: WorldOptions): Promise<World> {
  const cleanups: (() => void)[] = [];
  try {
    return await buildWorld(canvas, options, (fn) => cleanups.push(fn));
  } catch (error) {
    cleanups.reverse().forEach((fn) => fn());
    throw error;
  }
}

/** The actual construction; `onCleanup` registers undo steps used if a later step throws. */
async function buildWorld(canvas: HTMLCanvasElement, options: WorldOptions, onCleanup: (fn: () => void) => void): Promise<World> {
  const detail = DETAIL[options.tier];
  performance.mark('world:start');

  /* ── Start the heavy work in parallel: terrain (worker) + textures (network) ── */
  const loader = new THREE.TextureLoader();
  const [built, grassTex, rockTex, snowTex, cliffTex, waterNormals] = await Promise.all([
    startTerrainJob(options.tier), // usually already running (started by Scenery)
    loadTexture(loader, 'grass'),
    loadTexture(loader, 'rock'),
    loadTexture(loader, 'snow'),
    loadTexture(loader, 'cliff'),
    loadTexture(loader, 'waternormals', false),
  ]);

  /* ── Renderer, scene, camera ─────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  onCleanup(() => renderer.dispose());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, detail.pixelRatio));
  renderer.shadowMap.enabled = detail.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 1, 30000);
  scene.fog = new THREE.FogExp2(0xa6c8e8, 0.00006);

  /* ── Terrain: worker-built arrays + a texture-detail shader ──────────── */
  performance.mark('world:assets');
  const { terrain: data, forest } = built;
  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  terrainGeo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
  terrainGeo.setAttribute('weights', new THREE.BufferAttribute(data.weights, 3));
  terrainGeo.setIndex(new THREE.BufferAttribute(data.indices, 1));
  terrainGeo.computeBoundingSphere();

  // Keeps our palette, but multiplies in real surface detail from photos.
  // Triplanar: projected from 3 axes so cliffs don't stretch; sides use a cliff texture,
  // the top an aerial one. Sampling at two scales hides tiling.
  const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  terrainMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      tGrass: { value: grassTex }, tRock: { value: rockTex }, tSnow: { value: snowTex }, tCliff: { value: cliffTex },
      mGrass: { value: new THREE.Vector3(...TEXTURE_MEAN.grass) }, mRock: { value: new THREE.Vector3(...TEXTURE_MEAN.rock) },
      mSnow: { value: new THREE.Vector3(...TEXTURE_MEAN.snow) }, mCliff: { value: new THREE.Vector3(...TEXTURE_MEAN.cliff) },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 weights; varying vec3 vW; varying vec3 vWPos; varying vec3 vWNorm;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvW = weights; vWPos = (modelMatrix * vec4(transformed, 1.)).xyz; vWNorm = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D tGrass, tRock, tSnow, tCliff; uniform vec3 mGrass, mRock, mSnow, mCliff;
        varying vec3 vW; varying vec3 vWPos; varying vec3 vWNorm;
        vec3 two(sampler2D t, vec2 uv){ return mix(texture2D(t, uv / 55.).rgb, texture2D(t, uv / 230.).rgb, .45); }
        vec3 tri(sampler2D top, sampler2D side, vec3 p, vec3 n){ vec3 b = pow(abs(n), vec3(4.)); b /= b.x + b.y + b.z;
          return two(side, p.zy) * b.x + two(top, p.xz) * b.y + two(side, p.xy) * b.z; }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 nn = normalize(vWNorm);
        vec3 dG = tri(tGrass, tGrass, vWPos, nn) / mGrass;
        vec3 dR = tri(tRock, tCliff, vWPos, nn) / ((mRock + mCliff) * .5);
        vec3 dS = tri(tSnow, tSnow, vWPos, nn) / mSnow;
        diffuseColor.rgb *= mix(vec3(1.), clamp(dG * vW.x + dR * vW.y + dS * vW.z, 0., 2.), .8);`,
      );
  };
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  /* ── Forest: tiered pines (trunk + 3 tiers), colour variety, wind sway ── */
  const tint = (geo: THREE.BufferGeometry, hex: number) => {
    const c = new THREE.Color(hex);
    const arr = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const tier = (r: number, h: number, y: number, hex: number) => tint(new THREE.ConeGeometry(r, h, 8).translate(0, y, 0).toNonIndexed(), hex);
  const treeGeo = mergeGeometries([
    tint(new THREE.CylinderGeometry(0.9, 1.4, 7, 6).translate(0, 3.5, 0).toNonIndexed(), 0x4a3424),
    tier(8.5, 13, 11, 0x24451f),
    tier(6.8, 11, 17, 0x2a5124),
    tier(4.6, 10, 23, 0x31602a),
  ])!;
  const wind = { value: 0 };
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  treeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat sway = sin(uWind * 1.4 + instanceMatrix[3].x * .05 + instanceMatrix[3].z * .03) * .022 * position.y * position.y / 26.;\ntransformed.x += sway; transformed.z += sway * .6;',
      );
  };
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, forest.count);
  trees.castShadow = trees.receiveShadow = true;
  {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    for (let i = 0; i < forest.count; i++) {
      const o = i * 6, d = forest.data;
      q.setFromAxisAngle(up, d[o + 5]);
      m.compose(p.set(d[o], d[o + 1], d[o + 2]), q, s.set(d[o + 3], d[o + 4], d[o + 3]));
      trees.setMatrixAt(i, m);
      // Golden-ratio hue jitter: varied but deterministic greens
      const k = (i * 0.618) % 1;
      trees.setColorAt(i, c.setHSL(0.27 + k * 0.06, 0.35 + k * 0.2, 0.75 + ((i * 0.37) % 1) * 0.35));
    }
  }
  scene.add(trees);

  /* ── River: reflective water ─────────────────────────────────────────── */
  const water = new Water(new THREE.PlaneGeometry(2600, 6000), {
    textureWidth: detail.reflection,
    textureHeight: detail.reflection,
    waterNormals,
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x0e3a4a,
    distortionScale: 2.2,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, -2400);
  water.material.uniforms.size.value = 6;
  scene.add(water);

  /* ── Waterfall: a curtain of flowing water off the cliff, plus mist ──── */
  const wfZ = CLIFF.z + 20;
  const fallGeo = new THREE.PlaneGeometry(56, CLIFF.top + 12, 1, 24).translate(0, (CLIFF.top + 12) / 2 - 8, 0);
  const fallMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, light: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float time; uniform float light; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        float flow = n(vec2(vUv.x * 10., vUv.y * 26. + time * 3.2)) * .6 + n(vec2(vUv.x * 24., vUv.y * 60. + time * 5.)) * .4;
        float edge = smoothstep(0., .3, vUv.x) * smoothstep(1., .7, vUv.x) * smoothstep(1., .94, vUv.y);
        vec3 col = mix(vec3(.62, .8, .86), vec3(1.), smoothstep(.45, .8, flow)) * light;
        gl_FragColor = vec4(col, edge * (.75 + flow * .25)); }`,
  });
  const fall = new THREE.Mesh(fallGeo, fallMat);
  fall.position.set(CLIFF.x - 125, 0, wfZ);
  scene.add(fall);
  const soft = softTexture();
  const mist: THREE.Sprite[] = [];
  for (let i = 0; i < 14; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, transparent: true, opacity: 0.25, depthWrite: false }));
    sprite.position.set(CLIFF.x - 125 + (Math.random() - 0.5) * 80, 10 + Math.random() * 40, wfZ + Math.random() * 50);
    sprite.scale.setScalar(60 + Math.random() * 60);
    sprite.userData.offset = Math.random() * 6;
    scene.add(sprite);
    mist.push(sprite);
  }

  /* ── Clouds: a deck we descend through at the start ──────────────────── */
  const clouds: THREE.Sprite[] = [];
  const cloudMap = cloudTexture();
  for (let i = 0; i < 70; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
    // Keep a clear gap around the starting viewpoint so the first frame isn't a whiteout
    let x = (Math.random() - 0.5) * 6000;
    if (Math.abs(x) < 900) x += Math.sign(x || 1) * 900;
    sprite.position.set(x, 1950 + Math.random() * 300, 1200 - Math.random() * 2600);
    const w = 700 + Math.random() * 900;
    sprite.scale.set(w, w * 0.45, 1);
    scene.add(sprite);
    clouds.push(sprite);
  }

  /* ── Night sky: stars, moon + halo, northern lights ──────────────────── */
  const starPositions: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < 6000; i++) {
    v.randomDirection();
    if (v.y < -0.05) v.y *= -1;
    v.multiplyScalar(14000);
    starPositions.push(v.x, v.y, v.z);
  }
  const starGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.1, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  const moonMap = moonTexture();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonMap, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  moon.scale.setScalar(700);
  moon.position.set(-2600, 3400, -9000);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xcfe0ff, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  moonGlow.scale.setScalar(3200);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow, moon);
  const auroraMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { time: { value: 0 }, strength: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float time; uniform float strength; varying vec2 vUv;
      float h(float x){ return fract(sin(x * 127.1) * 43758.5453); }
      float n(float x){ float i = floor(x), f = fract(x); return mix(h(i), h(i + 1.), f * f * (3. - 2. * f)); }
      void main(){ float x = vUv.x * 14.;
        float curtain = pow(n(x + time * .25) * .6 + n(x * 3. - time * .4) * .4, 2.2) * 1.6;
        float rays = .6 + .4 * n(vUv.x * 120. + time);
        float fadeY = smoothstep(0., .25, vUv.y) * smoothstep(1., .45, vUv.y);
        vec3 col = mix(vec3(.15, 1., .55), vec3(.55, .3, 1.), smoothstep(.45, 1., vUv.y));
        gl_FragColor = vec4(col * curtain * rays * fadeY * strength, 1.); }`,
  });
  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(10000, 10000, 3200, 96, 1, true, Math.PI * (0.6 + i * 0.13), Math.PI * 0.4), auroraMat);
    band.position.set(0, 5200 + i * 500, -2200);
    band.rotation.z = (i - 1) * 0.05;
    scene.add(band);
  }

  /* ── Diyas on the river + fireflies over the fields (night only) ─────── */
  const glowPositions: number[] = [];
  for (let i = 0; i < 500; i++) {
    const z = -2350 - Math.random() * 900;
    const onRiver = Math.random() < 0.4;
    const x = riverX(z) + (Math.random() - 0.5) * (onRiver ? 70 : 900);
    glowPositions.push(x, Math.max(height(x, z), 0) + 2 + Math.random() * (onRiver ? 1 : 14), z);
  }
  const glows = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3)),
    new THREE.PointsMaterial({ map: soft, color: 0xffc56b, size: 5, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  scene.add(glows);

  /* ── Light: one sun for the whole world; cool moonlight at night ─────── */
  const sky = new Sky();
  sky.scale.setScalar(20000);
  Object.entries({ turbidity: 1.2, rayleigh: 2.2, mieCoefficient: 0.0012, mieDirectionalG: 0.78 }).forEach(([k, value]) => {
    sky.material.uniforms[k].value = value;
  });
  scene.add(sky);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3);
  sun.castShadow = detail.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 2;
  Object.assign(sun.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 10, far: 9000 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x3a3020, 1.1);
  const moonLight = new THREE.DirectionalLight(0xa9c2ff, 0);
  moonLight.position.set(-1, 0.6, -0.4);
  scene.add(hemi, moonLight);

  // Image-based lighting generated from our own sky, so ambient light always matches the sun.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky();
  envSky.material = sky.material;
  envSky.scale.setScalar(1000);
  envScene.add(envSky);
  let envTarget: THREE.WebGLRenderTarget | null = null;
  const updateEnvironment = () => {
    const next = pmrem.fromScene(envScene, 0.02);
    scene.environment = next.texture;
    envTarget?.dispose();
    envTarget = next;
  };

  /* ── Post-processing: bloom → ACES tone mapping → grade → vignette → grain ── */
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  const exposure = new ExposureEffect(0.32);
  const grade = new BrightnessContrastEffect({ brightness: 0, contrast: 0.08 });
  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY });
  grain.blendMode.opacity.value = 0.06;
  composer.addPass(
    new EffectPass(
      camera,
      exposure,
      new BloomEffect({ intensity: 0.55, luminanceThreshold: 0.92, luminanceSmoothing: 0.15, mipmapBlur: true }),
      new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
      new HueSaturationEffect({ saturation: 0.22 }),
      grade,
      new VignetteEffect({ offset: 0.3, darkness: 0.5 }),
      grain,
    ),
  );

  /* ── Day ↔ night: everything follows the sun's elevation ─────────────── */
  const sunState = { elevation: options.night ? -10 : DAY_ELEVATION };
  const sunDirection = new THREE.Vector3();
  const DAY_FOG = new THREE.Color(0x9fc3e6), NIGHT_FOG = new THREE.Color(0x1a2752);
  const applySun = () => {
    sunDirection.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - sunState.elevation), THREE.MathUtils.degToRad(215));
    sky.material.uniforms.sunPosition.value.copy(sunDirection);
    water.material.uniforms.sunDirection.value.copy(sunDirection).normalize();
    const day = THREE.MathUtils.clamp((sunState.elevation + 4) / 16, 0, 1);
    const night = 1 - day;
    sun.intensity = 3 * day;
    sun.color.setHSL(0.09, 0.8, 0.6 + 0.3 * Math.min(1, Math.max(0, sunState.elevation) / 20));
    hemi.intensity = 0.9 + 0.2 * day;
    hemi.color.setHex(day > 0.5 ? 0xbcd8ff : 0x8ea4e8);
    moonLight.intensity = 6 * night;
    scene.environmentIntensity = 0.55 + 0.9 * night;
    (scene.fog as THREE.FogExp2).color.copy(NIGHT_FOG).lerp(DAY_FOG, day);
    grade.brightness = 0.09 * night;
    exposure.exposure = 0.32 + 0.53 * night;
    stars.material.opacity = night;
    moon.material.opacity = night;
    moonGlow.material.opacity = night * 0.5;
    auroraMat.uniforms.strength.value = night * 0.42;
    glows.material.opacity = night;
    clouds.forEach((cloud) => (cloud.material.opacity = 0.7 * day + 0.08));
    fallMat.uniforms.light.value = 0.35 + 0.65 * day;
    water.material.uniforms.waterColor.value.setHex(day > 0.5 ? 0x0e3a4a : 0x061626);
  };
  applySun();
  updateEnvironment();

  /* ── Sizing ──────────────────────────────────────────────────────────── */
  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  onCleanup(() => resizeObserver.disconnect());
  resize();

  // Compile every shader BEFORE the first frame, without blocking, so the fade-in never stutters.
  performance.mark('world:built');
  await renderer.compileAsync(scene, camera);
  performance.mark('world:compiled');

  /* ── Loop: ease toward the scroll target; animate water, falls, aurora, trees ── */
  let target = 0, current = 0, pointerX = 0, pointerY = 0, frame = 0, elapsed = 0, last = performance.now();
  const pose = cameraPose(0);
  const look = new THREE.Vector3();
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    current += (target - current) * (options.motion ? Math.min(1, dt * 5) : 1);
    cameraPose(current, pose);
    camera.position.copy(pose.position);
    look.copy(pose.target);
    if (options.motion) {
      look.x += pointerX * 120;
      look.y -= pointerY * 60;
      camera.position.y += Math.sin(elapsed * 0.6) * 1.5; // gentle "breathing"
      water.material.uniforms.time.value += dt * 0.6;
      fallMat.uniforms.time.value = elapsed;
      auroraMat.uniforms.time.value = elapsed;
      wind.value = elapsed;
      mist.forEach((m) => {
        m.material.opacity = 0.18 + 0.1 * Math.sin(elapsed * 1.3 + m.userData.offset);
      });
      clouds.forEach((cloud, i) => (cloud.position.x += Math.sin(i) * dt * 6));
    }
    camera.lookAt(look);
    sun.target.position.copy(look);
    sun.position.copy(look).addScaledVector(sunDirection, 4000);
    composer.render(dt);
  };
  frame = requestAnimationFrame(loop);

  let tween: gsap.core.Tween | null = null;
  let lastEnvUpdate = 0;
  return {
    setProgress(p) {
      target = Math.min(1, Math.max(0, p));
    },
    setNight(night) {
      tween?.kill();
      tween = gsap.to(sunState, {
        elevation: night ? -10 : DAY_ELEVATION,
        duration: options.motion ? 3.2 : 0,
        ease: 'power2.inOut',
        onUpdate: () => {
          applySun();
          // Re-light from the sky a few times during the sunset (it's too costly every frame)
          if (performance.now() - lastEnvUpdate > 250) {
            updateEnvironment();
            lastEnvUpdate = performance.now();
          }
        },
        onComplete: updateEnvironment,
      });
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    dispose() {
      cancelAnimationFrame(frame);
      tween?.kill();
      resizeObserver.disconnect();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        materials.forEach((material) => material.dispose());
      });
      trees.dispose(); // instance matrix + colour buffers
      envSky.geometry.dispose();
      (water.material.uniforms.mirrorSampler.value as THREE.Texture | null)?.dispose(); // reflection render target's texture
      [grassTex, rockTex, snowTex, cliffTex, waterNormals, soft, cloudMap, moonMap].forEach((t) => t.dispose());
      envTarget?.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}

/** Exported for the still-frame renderer and tests: the world's bounds. */
export const WORLD_BOUNDS = WORLD;
