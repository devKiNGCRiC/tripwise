<!--
  2026-10-17-seven-worlds.md — implementation plan for the Seven Worlds UI rewrite.
-->
# Seven Worlds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every user-facing screen of `frontend/` on a living, procedurally drawn landscape of seven Indian regions, with Day and Night versions and a layered glass interface.

**Architecture:**
- **Engine:** a framework-free Canvas 2D engine in `src/world/`: noise, region data, `Scene`, and the pure helpers `nearestRegion` and `paletteFromPixels`.
- **Provider and canvas:** a `WorldProvider` (React context) owns the current region, the photo tint and the auto-tour. A fixed `<LivingWorld>` canvas, mounted once in `RootLayout`, draws it behind every page.
- **Pages:** each page is glass panels over that world.
- **Unchanged:** the plumbing (API, auth, mocks, router, guards, theme storage, Calm motion).

**Tech Stack:** React 19, TypeScript ~6, Vite 8, Tailwind CSS 4, React Router 8, TanStack Query 5, Vitest + Testing Library + MSW 2, Fontsource (Fraunces variable, Plus Jakarta Sans variable, Tiro Devanagari Hindi), Lenis.

**Spec:** `docs/superpowers/specs/2026-10-17-seven-worlds-design.md` (prototype: `docs/design/tripwise-living.html`, whose drawing code is the reference for `scene.ts`).

## Global Constraints

- Free only; fonts self-hosted via Fontsource. No new paid services.
- Every file has a header comment, and every function and block has a comment (the owner's rule).
- Never add Claude or co-author attribution to code, docs or commits.
- Keep `tw_theme` (`light`/`dark`), `tw_motion` (`calm`), the API client, auth, mocks, router and guards untouched.
- Region storage key: `tw_region`. Default region: `himalaya`. The auto-tour runs on the landing page only, every **10 s**, and stops for good on any user pick.
- Cross-fade **1.4 s**. Device pixel ratio capped at **1.5**. Photo tint uses `color` blend at **0.38** opacity.
- Reduced motion or Calm: one still frame, no auto-tour, reveals shown immediately.
- Must fit 1280×720 and 1366×768 (hero above the fold), and work at 390px wide.

## Review Focus

1. **No canvas (jsdom, old browsers):** the app renders normally over a CSS sky gradient in the region's colours. Test in Task 3.
2. **Blocked or garbage `localStorage` (`tw_region` = "mars"):** falls back to Himalaya and never throws. Test in Task 3.
3. **Odd photos (grey-only, tiny 1×1, mostly transparent):** `paletteFromPixels` still returns four valid `#rrggbb` swatches and accents. Test in Task 2.
4. **Rapid region clicks during a cross-fade, or a theme toggle mid-fade:** only the latest region shows, with no stuck half-faded world (the renderer keeps exactly one `prev`). Checked in Task 3 by the provider test asserting the final region after three quick `setRegion` calls.
5. **Location far outside India (London, say):** `nearestRegion` still returns a valid region key and does not crash. Test in Task 2.

---

### Task 1: Foundation — fonts, tokens, glass, theme toggle

**Files:**
- Modify: `frontend/package.json` (add `@fontsource-variable/fraunces`, `@fontsource-variable/plus-jakarta-sans`; remove `@fontsource/gloock`, `@fontsource/hind`)
- Modify: `frontend/src/main.tsx` (font imports: `@fontsource-variable/fraunces/full.css` if present, else `index.css`; `@fontsource-variable/plus-jakarta-sans`; keep Tiro 400 + 400-italic)
- Rewrite: `frontend/src/theme/tokens.css`, `frontend/src/index.css`, `frontend/src/theme/ThemeToggle.tsx`

**Interfaces:**
- **Produces CSS tokens:**
  - `--trip-ink`, `--trip-soft`, `--trip-line`
  - `--trip-glass`, `--trip-glass-strong`, `--trip-glass-edge`
  - `--trip-accent`, `--trip-accent-2`, `--trip-on-accent` (the region sets these at runtime)
  - `--trip-scrim`, plus `--trip-page-max: 1360px` / `--trip-page-pad`
- **Produces Tailwind colours and fonts:**
  - colours: `ink`, `soft`, `line`, `glass`, `glass-strong`, `accent`, `accent-2`, `on-accent`, `danger`
  - fonts: `font-display` (Fraunces), `font-body` (Plus Jakarta Sans), `font-hindi`
- **Produces utilities:** `glass`, `glass-strong`, `page-wrap`, `swap` (text change animation: 0.8 s up+blur), `reveal-up` (kept).
- **Produces `ThemeToggle`:** a round glass button showing ☾ by day and ☀ by night. Labels: "Switch to night theme" / "Switch to day theme" (the existing ThemeProvider tests keep passing).

- [ ] **Step 1:** Install and remove the font packages. Rewrite tokens and index.css, using the values from the prototype `:root` / `[data-mode='night']` blocks, mapped to `:root` / `[data-theme='dark']`. `body` background is transparent over the world. `html` gets the fallback sky gradient from `--trip-sky-top` / `--trip-sky-bottom`, which the provider also sets.
- [ ] **Step 2:** Run `npx vitest run src/theme`. Expect PASS (4 tests).
- [ ] **Step 3:** Run `npx tsc --noEmit && npx eslint src/theme`. Expect clean.
- [ ] **Step 4:** Commit: `feat(frontend): Seven Worlds foundation — Fraunces/Jakarta fonts, glass tokens, theme toggle`

### Task 2: World engine (pure, framework-free)

**Files:**
- Create: `frontend/src/world/noise.ts`, `frontend/src/world/regions.ts`, `frontend/src/world/scene.ts`, `frontend/src/world/geo.ts`, `frontend/src/world/palette.ts`
- Test: `frontend/src/world/world.test.ts`

**Interfaces:**
- **`noise.ts`:**
  - `rng(seed: number): () => number`
  - `fbm1(seed: number): (x: number) => number` (range ≈ −1..1)
  - `mixHex(a: string, b: string, t: number): string` → `rgb(r,g,b)`
  - `smoothstep(a, b, x)`
- **`regions.ts`:**
  - `type RegionKey = 'himalaya' | 'thar' | 'ganga' | 'deccan' | 'ghats' | 'konkan' | 'sisters'`
  - `interface Region { key; name; hi; headline: string /* plain text before the italic part */; accent: string /* italic part */; lede; elev; terr; best; months: number[] /* 12 values, 1–3 */; sig: [string, string, string]; places: string[]; ui: { day: [string, string]; night: [string, string] }; sky: { day: [string, string]; night: [string, string] }; sun: [number, number]; layers: Layer[]; fx: { day: Fx[]; night: Fx[] }; centre: [number, number] }`
  - `REGIONS: Region[]` (7, in spec order, content copied from the prototype)
  - `regionByKey(k: string): Region | undefined`
- **`scene.ts`:**
  - `class Scene { constructor(region: Region); draw(ctx: CanvasRenderingContext2D, w: number, h: number, seconds: number, night: number, mx: number, my: number, scroll: number, alpha?: number): void }`
  - The drawing logic is ported from the prototype's `Scene` and typed. Layer and decoration types match the prototype.
- **`geo.ts`:** `nearestRegion(lat: number, lon: number): RegionKey` (squared distance to `Region.centre`)
- **`palette.ts`:**
  - `interface Palette { tint: string; swatches: [string, string, string, string]; accents: { day: [string, string]; night: [string, string] } }`
  - `paletteFromPixels(data: Uint8ClampedArray | number[]): Palette`. This is the prototype's `palette()` without the canvas: buckets of 3 bits per channel, the most common colour becomes the tint, and vivid colours (saturation > 0.3, 0.2 < L < 0.75) become the accents. It falls back to the dominant colour, then to grey `#808080`.

- [ ] **Step 1: Write the failing tests** in `world.test.ts`:

```ts
it('has seven regions in landscape order, each with 12 month scores', () => {
  expect(REGIONS.map((r) => r.key)).toEqual(['himalaya', 'thar', 'ganga', 'deccan', 'ghats', 'konkan', 'sisters']);
  REGIONS.forEach((r) => { expect(r.months).toHaveLength(12); expect(r.sig).toHaveLength(3); });
});
it('finds the nearest region', () => {
  expect(nearestRegion(30.74, 79.49)).toBe('himalaya');   // Badrinath
  expect(nearestRegion(26.91, 70.92)).toBe('thar');       // Jaisalmer
  expect(nearestRegion(25.32, 82.97)).toBe('ganga');      // Varanasi
  expect(nearestRegion(15.33, 76.46)).toBe('deccan');     // Hampi
  expect(nearestRegion(15.5, 73.83)).toBe('konkan');      // Goa
  expect(nearestRegion(25.57, 91.88)).toBe('sisters');    // Shillong
  expect(REGIONS.map((r) => r.key)).toContain(nearestRegion(51.5, -0.12)); // London still answers
});
it('reads a palette from pixels, even odd ones', () => {
  const hexRe = /^#[0-9a-f]{6}$/;
  for (const px of [orangeAndTeal(), allGrey(), [10, 20, 30, 255]]) {
    const p = paletteFromPixels(px);
    [p.tint, ...p.swatches, ...p.accents.day, ...p.accents.night].forEach((c) => expect(c).toMatch(hexRe));
  }
  expect(paletteFromPixels(orangeAndTeal()).accents.day[0]).not.toBe(paletteFromPixels(allGrey()).accents.day[0]);
});
it('draws a scene without throwing on a stub context', () => { /* recording stub ctx; new Scene(REGIONS[i]).draw(stub, 800, 600, 3, 0/1, 0, 0, 0) for every region × day/night */ });
```

  `orangeAndTeal()` and `allGrey()` are small inline helpers that build RGBA arrays. The stub context's methods are no-ops, and `createLinearGradient` / `createRadialGradient` return `{ addColorStop() {} }`.
- [ ] **Step 2:** Run `npx vitest run src/world`. Expect FAIL (modules missing).
- [ ] **Step 3:** Implement the five modules with the interfaces above. Region centres: himalaya [32, 78], thar [26.8, 71.5], ganga [25.5, 82], deccan [16.5, 76.5], ghats [11.5, 76.2], konkan [15, 74.2], sisters [26, 92.5].
- [ ] **Step 4:** Run `npx vitest run src/world`. Expect PASS.
- [ ] **Step 5:** Commit: `feat(frontend): living-world engine — seven regions, procedural scene, nearest region, photo palette`

### Task 3: WorldProvider + LivingWorld canvas

**Files:**
- Create: `frontend/src/world/WorldProvider.tsx`, `frontend/src/world/LivingWorld.tsx`, `frontend/src/world/useThumbnails.ts`
- Modify: `frontend/src/App.tsx` (wrap in `<WorldProvider>` inside ThemeProvider), `frontend/src/test/render.tsx` (`AppProviders` also wraps WorldProvider), `frontend/src/components/layout/RootLayout.tsx` (mount `<LivingWorld />` + scrim; drop CursorRing)
- Test: `frontend/src/world/WorldProvider.test.tsx`

**Interfaces:**
- **`useWorld()` returns:** `{ region: Region; index: number; setRegion(key: RegionKey, opts?: { fromUser?: boolean }): void; touring: boolean; startTour(): void; stopTour(): void; tint: Palette | null; setTint(p: Palette | null): void }`
  - **Persistence:** `setRegion` writes `tw_region` (try/catch). The initial state reads it and falls back to `himalaya`.
  - **Auto-tour:** `startTour` advances every 10 s while `touring` is true and motion is not reduced. `setRegion(..., { fromUser: true })` sets `touring = false`.
  - **CSS variables on `<html>`:** the provider sets `--trip-accent`, `--trip-accent-2` and `--trip-on-accent` from `tint?.accents ?? region.ui` for the current theme, and `--trip-sky-top` / `--trip-sky-bottom` from `region.sky`.
- **`<LivingWorld />`:** a fixed full-screen canvas.
  - If `getContext('2d')` is null it renders nothing (the CSS sky shows).
  - It keeps `cur` / `prev` Scenes, eases night toward the theme, applies pointer and scroll parallax, and pauses when `document.hidden`.
  - Reduced or Calm motion: it draws only on change.
- **`useThumbnails(): string[]`:** seven data URLs drawn once, or `''` entries when canvas is unavailable.

- [ ] **Step 1: Write the failing tests:**
  - `'starts on Himalaya and remembers a chosen region'`: render a consumer, `setRegion('ganga', { fromUser: true })`, then expect `localStorage.tw_region === 'ganga'` and `region.name === 'Gangetic Plains'`.
  - `'falls back to Himalaya for an unknown stored region'`: set `tw_region` to `mars` first and expect Himalaya.
  - `'stops the tour for good when the user picks'`: `startTour()`, then `setRegion('thar', { fromUser: true })`, and expect `touring === false`. With fake timers, advance 10 s and expect the region to still be thar.
  - `'shows the last of several quick picks'`: three `setRegion` calls in a row; expect the last one.
  - `'sets the region accent on the page'`: `document.documentElement.style.getPropertyValue('--trip-accent')` equals region.ui.day[0].
- [ ] **Step 2:** Run `npx vitest run src/world/WorldProvider.test.tsx`. Expect FAIL.
- [ ] **Step 3:** Implement the provider, LivingWorld, useThumbnails, and the App, render and RootLayout wiring.
- [ ] **Step 4:** Run `npx vitest run`. Expect the new tests to pass. Existing tests may fail only on removed UI, which Tasks 5–6 fix.
- [ ] **Step 5:** Commit: `feat(frontend): WorldProvider and LivingWorld — shared living background, remembered region, auto-tour, tint`

### Task 4: Glass layout and UI primitives

**Files:** Rewrite `components/layout/{Navbar,MobileTabBar,Footer,Logo,FullPageLoader,ServerWakingBanner}.tsx` and `components/ui/{Button,Card,Chip,Input,GlassPanel,Skeleton,Stamp,Toast}.tsx`, keeping the existing props and APIs.

**Interfaces:**
- **Unchanged:** all component props and APIs, so `ui.test.tsx`, `Toast.test.tsx` and `ServerWakingBanner.test.tsx` pass unmodified.
- **Logo:** an arch mark (clip-path `archClip`, defined once in RootLayout's hidden SVG) plus "TripWise" in Fraunces, `aria-label="TripWise home"`.

- [ ] **Step 1:** Restyle to the prototype: glass pill nav (h 62, rounded-full), primary button = ink pill / accent variant, chips = glass pills, inputs = soft glass fields.
- [ ] **Step 2:** Run `npx vitest run src/components`. Expect PASS.
- [ ] **Step 3:** Commit: `feat(frontend): glass navbar, tab bar, footer and UI primitives for Seven Worlds`

### Task 5: Landing page

**Files:**
- Create: `features/landing/{Hero,Planner,Dossier,RegionBar,TravellerKinds,Worlds,YourColours}.tsx`, `features/landing/kinds.ts`
- Rewrite: `pages/LandingPage.tsx`, `pages/LandingPage.test.tsx`
- Delete: the old landing sections (Journeys, SampleTrip, CrewTeaser, CallToAction, ArrivalPanel, RouteMap, JourneyRail, heroPlaces, SectionStop, delay)

**Interfaces:**
- **`kinds.ts`:** `KINDS: { title: 'Solo'|'Friends'|'Backpackers'|'Family'|'Couples'; who: string; line: string; perks: [string, string, string] }[]` (copy from the prototype).
- **LandingPage:** calls `startTour()` on mount and `stopTour()` on unmount.
- **Planner:** submits to `/plan?destination=<trimmed>` (or `/plan`). The input is labelled "Where do you want to go?" and the button is "Plan".
- **Shared "who" state:** lives in LandingPage, passed to Hero chips, Planner select and TravellerKinds.

- [ ] **Step 1: Write the failing tests** (`LandingPage.test.tsx`):
  - h1 contains "Where the mountains keep time." on a first visit.
  - **The region bar switches the world:** click `button "Thar"` in `navigation "Regions"`; expect the h1 to contain "Where the sand remembers kings." and the dossier region (`complementary "Region dossier"`) to show "150–300 m".
  - **The dossier shows 12 months** with the current one marked (`aria-current="date"`).
  - **Planner hand-off:** type "Goa", click "Plan", expect `/login?next=` + `encodeURIComponent('/plan?destination=Goa')`.
  - **Traveller cards:** clicking "Family" sets `aria-pressed` on the card and the hero chip, and the planner select's value becomes "Family".
  - **Seven worlds:** clicking the "Konkan & Malabar" world card switches the h1.
  - **Your colours:** the "Choose a photo" button exists, and the "Use my location" button exists.
- [ ] **Step 2:** Run the test file. Expect FAIL.
- [ ] **Step 3:** Implement the sections per the spec §4 and the prototype layout:
  - Hero: grid of `minmax(0,1.15fr) minmax(320px,.85fr)`.
  - h1: `clamp(44px, min(6vw, 10vh), 108px)`.
  - Region bar at the bottom of the hero (`min-h-svh`).
  - Sections below as glass panels.
- [ ] **Step 4:** Run `npx vitest run src/pages/LandingPage.test.tsx`. Expect PASS.
- [ ] **Step 5:** Commit: `feat(frontend): Seven Worlds landing — hero planner, region dossier, touring region bar, traveller cards, worlds, your colours`

### Task 6: Other pages on the living world

**Files:**
- Rewrite: `features/auth/AuthLayout.tsx`, `pages/{PassportPage,NotFoundPage,ComingSoonPage}.tsx`, `components/layout/{RouteError,RouteGuards(admins-only block)}.tsx`
- Replace: `components/layout/LiquidScene.tsx` with `WorldStage.tsx` (centred glass card over the world, with top padding for the nav)

**Interfaces:**
- **Headings unchanged** ("Welcome back", "Start your passport", "Your passport", "Lost luggage", "Admins only", ComingSoon titles), so `router.test.tsx`, `AuthForms.test.tsx` and `PassportPage.test.tsx` pass. The passport test keeps "Passport cover" and the Motion radios.

- [ ] **Step 1:** Restyle the pages. AuthLayout: the promise on the left (desktop) in Fraunces over the world, and the glass-strong form card on the right with bilingual eyebrows.
- [ ] **Step 2:** Run `npx vitest run`. Expect all PASS.
- [ ] **Step 3:** Commit: `feat(frontend): login, signup, passport, 404, coming-soon and error pages on the living world`

### Task 7: Cleanup, docs, verification

**Files:**
- Delete the unused Monsoon Editorial modules: `components/signature/{LiquidCanvas,liquidRenderer,liquidShader,PhotoLiquid,photoLiquidRenderer,photoLiquidShader,webgl,CursorRing,Rangoli,Kolam}` + `signature.test.tsx` (keep `SmoothScroll`, `useReveal`). Delete `features/explore/DestinationCard` only if unused (keep it: Explore will use it).
- Update `README.md` and `frontend/README.md` (design section → Seven Worlds), and the spec status.

- [ ] **Step 1:** Delete the modules. `grep -rn "LiquidCanvas\|PhotoLiquid\|Rangoli\|Kolam\|CursorRing" src` should return nothing.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint . && npx vitest run && npm run build`. Expect everything clean and passing, with no chunk-size warning.
- [ ] **Step 3:** Visual pass in Edge with playwright: each region Day and Night at 1440×860, 1280×720 and 390×844, plus login, passport and 404. No page errors.
- [ ] **Step 4:** Commit: `chore(frontend): remove Monsoon Editorial modules; docs for Seven Worlds`
