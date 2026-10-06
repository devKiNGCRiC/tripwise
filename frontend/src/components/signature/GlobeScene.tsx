/**
 * GlobeScene.tsx — the real 3D globe (Three.js). Lazy-loaded by Globe.tsx, so its
 * ~150 KB of 3D code only downloads on capable desktop/tablet screens.
 *
 * What's in the scene:
 *  - a textured Earth with India turned toward the viewer,
 *  - a soft atmosphere glow (sky blue by day, saffron by night),
 *  - glowing flight arcs from India, and a little plane flying each route in turn.
 *
 * Interaction: drag to spin; it drifts back toward India so the routes stay in view.
 * Performance: rendering pauses when the globe is off-screen or the tab is hidden,
 * and everything is disposed when the component unmounts.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLOBE_LABEL } from './GlobeFallback';

/** [latitude, longitude] of the places our routes connect. */
const CITIES = {
  delhi: [28.6, 77.2],
  goa: [15.3, 74.0],
  leh: [34.2, 77.6],
  dubai: [25.2, 55.3],
  paris: [48.9, 2.35],
  bali: [-8.4, 115.2],
  tokyo: [35.7, 139.7],
} as const;

type City = keyof typeof CITIES;

/** Each route: from, to, colour (from the palette). */
const ROUTES: [City, City, number][] = [
  ['delhi', 'paris', 0xff9933],
  ['delhi', 'tokyo', 0xffc72c],
  ['goa', 'bali', 0x9be08a],
  ['delhi', 'dubai', 0xe63946],
  ['delhi', 'goa', 0xff7a00],
  ['delhi', 'leh', 0x5bc8f5],
];

const RADIUS = 1.6;
/** Rotation that faces India toward the camera (Delhi sits at −z in this lat/lon mapping). */
const HOME_Y = Math.PI + 0.25;

/** Convert latitude/longitude to a point on the sphere. */
function toVector(lat: number, lon: number, radius = RADIUS) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export default function GlobeScene({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Lets the theme effect re-tint the scene without rebuilding it. */
  const applyThemeRef = useRef<(dark: boolean) => void>(() => {});

  // Build the scene once; tear it all down on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.3, 6.2);

    // Lights: soft fill + a warm "afternoon sun" from the upper right.
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const sun = new THREE.DirectionalLight(0xffe2b8, 2.4);
    sun.position.set(4, 3, 5);
    scene.add(sun);

    const world = new THREE.Group();
    world.rotation.set(0.35, HOME_Y, 0);
    scene.add(world);

    // Earth
    const texture = new THREE.TextureLoader().load('/textures/earth.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    const earthMaterial = new THREE.MeshPhongMaterial({ map: texture, color: 0xdaf4ff, shininess: 18 });
    world.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 64, 64), earthMaterial));

    // Atmosphere: a back-facing shell that glows strongest at the rim (fresnel effect).
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0xffffff) } },
      vertexShader:
        'varying vec3 vNormal; void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform vec3 glowColor; varying vec3 vNormal; void main(){ float i = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(glowColor, 1.0) * i * 0.9; }',
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 1.12, 64, 64), glowMaterial));

    // City pins
    Object.values(CITIES).forEach(([lat, lon]) => {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffc72c }));
      pin.position.copy(toVector(lat, lon, RADIUS * 1.01));
      world.add(pin);
    });

    // Flight arcs: curves lifted above the surface (longer routes fly higher).
    const curves = ROUTES.map(([from, to, color]) => {
      const [fromLat, fromLon] = CITIES[from];
      const [toLat, toLon] = CITIES[to];
      const start = toVector(fromLat, fromLon, RADIUS * 1.01);
      const end = toVector(toLat, toLon, RADIUS * 1.01);
      const lift = 1 + start.distanceTo(end) * 0.35;
      const control = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * lift);
      const curve = new THREE.QuadraticBezierCurve3(start, control, end);
      world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.013, 8), new THREE.MeshBasicMaterial({ color })));
      return curve;
    });

    // The plane: a small glowing cone that flies each route in turn.
    const plane = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.17, 12),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xff9933, emissiveIntensity: 0.7 }),
    );
    world.add(plane);

    applyThemeRef.current = (isDark) => {
      earthMaterial.color.set(isDark ? 0x9fc8ff : 0xdaf4ff);
      glowMaterial.uniforms.glowColor.value.set(isDark ? 0xff9933 : 0xffffff);
    };

    // Keep the drawing buffer the same size as the canvas on screen.
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    // Drag to spin, with a little inertia.
    let dragging = false;
    let lastX = 0;
    let velocity = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      velocity = (e.clientX - lastX) * 0.005;
      world.rotation.y += velocity;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    // Only animate while visible on screen and while the tab is in front.
    let onScreen = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    visibilityObserver.observe(canvas);

    let frameId = 0;
    let progress = 0;
    let route = 0;
    let clock = 0;
    const lookTarget = new THREE.Vector3();
    const frame = () => {
      frameId = requestAnimationFrame(frame);
      if (!onScreen || document.hidden) return;

      // Move the plane along the current route; switch routes at the end.
      progress += 0.005;
      if (progress >= 1) {
        progress = 0;
        route = (route + 1) % curves.length;
      }
      const curve = curves[route];
      plane.position.copy(curve.getPoint(progress));
      lookTarget.copy(curve.getPoint(Math.min(progress + 0.01, 1))).applyMatrix4(world.matrixWorld);
      plane.lookAt(lookTarget);
      plane.rotateX(Math.PI / 2);

      // Gentle sway around India, plus drag inertia easing back home.
      if (!dragging) {
        clock += 0.006;
        velocity *= 0.94;
        world.rotation.y += velocity + (HOME_Y + Math.sin(clock) * 0.4 - world.rotation.y) * 0.02;
      }
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      // Free GPU memory: every geometry, material and the texture.
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => m.dispose());
        }
      });
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  // Re-tint for Day / Night Flight without rebuilding the scene.
  useEffect(() => {
    applyThemeRef.current(dark);
  }, [dark]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={GLOBE_LABEL}
      className="block size-full cursor-grab touch-pan-y active:cursor-grabbing"
    />
  );
}
