# TripWise — "The Descent": 3D World Background — Spec & Plan

**Date:** 2026-10-07
**Status:** Draft. Direction approved; awaiting the user's review of this plan.
**Builds on:** `2026-10-07-yatra-mela-redesign.md`, whose colours, fonts, departure board, Hindi signage and passport stay.

**References:**
- `docs/design/descent-world-prototype.html`: the approved 3D prototype.
- `docs/design/descent-photo-pack-preview.html`: the photo fallback.

## 1. What we're building

The landing page becomes **one continuous 3D world** that the camera flies down through as you scroll:

**sky → glacier → mountains → waterfall → river → fields**

- **One environment:** a single sun, atmosphere and haze, so every part connects.
- **Day and Night:** "Night" sets the sun for real. Then come the stars, the moon, the northern lights, moonlit snow, diyas on the river and fireflies.
- **Content on top:** the landing content floats over the world on frosted-glass panels:
  - departure board and plan form
  - "How it works" route
  - destination postcards
  - AI moment
  - crew teaser
  - final call to action
- **Reveal timing:** each panel is tied to its stage of the descent.
- **Altitude meter:** counts down from 9,000 m to 0 m.

## 2. Scene packs (how people with different devices get a good experience)

| Pack | Who gets it | What it is |
|---|---|---|
| `world3d` | Desktop, laptop and strong phones: WebGL2, ≥ 4 GB device memory, ≥ 768px wide, no Data Saver | The full 3D world |
| `photo` | Weaker phones, Data Saver, no WebGL2, or 3D failed to start | The real-photo descent, with blended bands, parallax and day-for-night grading |
| `illustrated` | Later: user choice and data-saver mode | Layered illustrated art (deferred) |

- **Reduced motion:** gets the `photo` pack with no parallax, plus a static altitude meter.
- **Switching:** a "Scenery: Realistic 3D / Photo" setting lives on the Passport page and is remembered on the device.
- **Progressive loading:**
  1. The page paints first with the photo hero.
  2. The 3D world loads in the background (lazy chunk plus textures).
  3. It cross-fades in once it's ready.

  This keeps first paint under 3 seconds even on slow networks.

## 3. Architecture

```
src/scene/
  quality.ts            choose pack + detail tier (pure, unit-tested)
  SceneProvider.tsx     pack choice, day/night → sun tween, progress context
  SmoothScroll.tsx      Lenis + GSAP ScrollTrigger wiring (one place)
  photo/                PhotoDescent.tsx (the photo pack)
  world/
    WorldCanvas.tsx     lazy entry; mounts renderer, cross-fades in, disposes everything
    terrain.ts          height(x,z), riverX(z), cliff; pure + unit-tested
    terrain.worker.ts   builds geometry/colours/weights off the main thread
    terrainMaterial.ts  triplanar Poly Haven texture detail (grass/rock/snow/cliff)
    sky.ts              Sky shader + sky-matched image-based lighting
    water.ts            reflective river
    waterfall.ts        fall shader + mist
    forest.ts           instanced tiered pines with wind
    night.ts            stars, moon, aurora, diyas, fireflies
    camera.ts           camera + look paths, progress → pose (pure, unit-tested)
    effects.ts          bloom, ACES tone mapping, grade, vignette, grain
public/world/            textures (WebP/JPG 512–1k, ~0.5 MB total) + water normals
```

- **Theme:** "Day / Night Flight" stays in `ThemeProvider`. The scene reads it and tweens the sun over 3.2s.
- **Landing panels:** each section registers its stage (0–1) through a `useDescentStage(at)` hook, which handles reveals and the altitude meter.
- **Other pages** (login, passport, explore…) show a **still frame** of the world, a fixed camera at a fitting altitude, slightly blurred behind the content. There's no scroll flight there.
- **Libraries:** `three`, `postprocessing`, `gsap`, `lenis` (all free and MIT-licensed). Textures come from Poly Haven (CC0). The water-normals texture comes from three.js examples (MIT).

## 4. Budgets and safety

- **Frame rate:** 60 fps on a mid laptop and ≥ 30 fps on a mid phone (`world3d` low tier).
- **Detail tiers:**
  - **High:** 460² terrain grid, shadows, 6k trees and DPR 1.5.
  - **Low:** 220² grid, no shadows, 2.5k trees and DPR 1.
- **Download size:** 3D chunk ≤ 250 KB gzip; textures ≤ 600 KB; loaded only after first paint.
- **Pausing:** rendering pauses when the tab is hidden or the landing scene is off-screen.
- **Cleanup:** all GPU resources are disposed on unmount (StrictMode-safe).
- **Error handling:** any WebGL error or lost context makes it fall back to the photo pack via an error boundary.

## 5. Plan (executed inline, tests first for the logic)

| # | Task | Tests |
|---|---|---|
| 1 | Add `gsap`, `lenis` and `postprocessing`. `SmoothScroll` provider; respect reduced motion. | Provider renders; disabled when reduced motion is on |
| 2 | `quality.ts`: pack + tier selection from capabilities. | Unit table: devices → pack/tier |
| 3 | `terrain.ts` and `camera.ts` as pure modules, ported from the prototype. | Height continuity, river below 0, camera path endpoints |
| 4 | Photo pack (`PhotoDescent`) ported from the photo preview, with local optimised images. | Renders bands; static under reduced motion |
| 5 | `WorldCanvas`: renderer, terrain (worker), material, sky/IBL, water, waterfall, forest, night, effects; cross-fade in; dispose. | Mounts the fallback in jsdom; lazy chunk separate in build |
| 6 | `SceneProvider` + `useDescentStage`. Theme → sun tween; altitude meter. | Stage visibility maths; theme switch calls tween |
| 7 | Landing page rebuilt as descent chapters with glass panels (existing content), plus a scenery setting on the Passport page. | Updated landing tests (content order, a11y) |
| 8 | Still-frame backdrop for the other pages. | Visual check |
| 9 | Verify: lint, typecheck, tests, build size budgets, real-browser screenshots at desktop and phone sizes in both themes, plus a frame-rate check. Then the final review. | Full suite |

## 6. Out of scope

- The illustrated pack.
- Photorealistic water simulation.
- Volumetric clouds.
- Explore/planner page content (Plan 2).

## 7. Implementation notes (deviations, decided while building)

- **Fixed background, not section-tied stages.** The scenery is one fixed layer driven by a single progress
  value (`scene/descent.ts`). Content scrolls normally on glass panels, revealed by GSAP. The photo pack
  **cross-fades** its six photos with a slow drift instead of stacking bands, which gives smoother transitions.
- **No `useDescentStage` hook.** Panels reveal themselves (`useReveal`), and the altitude meter reads progress.
- **Other pages use still photos (`StillScenery`), not a 3D still frame.** There's no GPU cost on pages for
  doing things, and they look consistent with the photo pack.
- **Kite sky, lanterns and the CSS globe were removed**, replaced by the real scenery.
- **Load time:** the terrain worker starts at mount, in parallel with the 3D chunk download. Trees are placed
  from the already-built grid. Shaders compile asynchronously before the fade-in.
  Measured on a production build: page content in about 0.5 s (fast Wi-Fi) or 2.8 s (slow 4G), and the
  3D world in about 2.9 s or 3.6 s.
- **Custom exposure step before ACES tone mapping**, because post-processing tone mapping ignores the
  renderer's exposure setting.
