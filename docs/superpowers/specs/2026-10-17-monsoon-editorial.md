<!--
  2026-10-17-monsoon-editorial.md — design spec for the full UI rewrite ("Monsoon Editorial").
  Replaces the Yatra Mela look and The Descent scenery. Preview: docs/design/tripwise-monsoon-editorial.html
-->
# Monsoon Editorial: UI rewrite

**Status:** approved direction. Implemented 2026-10-17.
**Replaces:**
- `2026-10-07-yatra-mela-redesign.md`, whose tokens and components are rewritten.
- `2026-10-07-descent-world.md`, whose scenery is removed.

**Visual reference:** `docs/design/tripwise-monsoon-editorial.html`

## 1. Idea

The style combines two of the earlier directions:

- **Material, from Liquid Monsoon.** A living liquid colour field sits behind the key surfaces and ripples under the cursor. Frosted glass panels float over it.
- **Voice, from Rangoli Editorial.** Large serif headlines carry Hindi accents. A gold rangoli line draws itself. Destinations are shown with cinematic full-bleed photography.

It is calm and editorial, and Indian without being a costume: one serif, one body face, one Devanagari face, and one accent metal (gold).

| Theme | Name | Palette |
| --- | --- | --- |
| `light` | Day (dawn) | ivory, peach, soft teal, saffron light |
| `dark` | Night (monsoon) | indigo, rain teal, sky, marigold |

## 2. Tokens (`src/theme/tokens.css`)

| Token | Day | Night | Job |
| --- | --- | --- | --- |
| `paper` | #f6efe3 | #0a1230 | page background |
| `paper-2` | #efe4d2 | #0f1a40 | alternate surfaces |
| `ink` | #1c1814 | #f6efe3 | text |
| `ink-soft` | #5b5148 | #b9b4c9 | secondary text |
| `line` | ink at 14% | ink at 14% | hairlines and borders |
| `gold` | #8f5d14 | #e6b765 | accent metal: Hindi accents, ornaments, numbers (AA on paper) |
| `accent` | #0e6b70 | #6fd3d0 | links, focus ring, success |
| `cta` / `on-cta` | ink / paper | gold / indigo | primary buttons |
| `glass` | white at 50% | indigo at 45% | frosted panels |
| `danger` | #b42318 | #ff8a80 | errors |

The theme is stored as `data-theme="light" | "dark"`, as before: same storage key and the same pre-paint script.

## 3. Type

| Role | Font | Notes |
| --- | --- | --- |
| Display (`font-display`) | Gloock 400 | headlines, numbers, prices |
| Body (`font-body`) | Hind 400/500/600 | Indian foundry; Latin + Devanagari |
| Hindi accents (`font-hindi`) | Tiro Devanagari Hindi 400 / italic | every Hindi line carries `lang="hi"` |

Fonts are self-hosted via Fontsource, with no Google Fonts request.

## 4. Signature pieces (`src/components/signature/`)

- **LiquidCanvas.** A plain WebGL fragment shader (no three.js): domain-warped fbm in two palettes.
  - **Theme blend.** A `night` uniform blends the palettes and eases toward the theme on toggle, so the colours *flow* into the new palette.
  - **Ripples.** A ring buffer of six ripples is fed by pointer down and by pointer movement (one ripple per 0.4 s).
  - **Performance.** Renders at about 60% resolution, pauses when off screen or when the tab is hidden, and stops once `reduced motion` settles it on a still frame.
  - **Fallback.** Without WebGL it falls back to a CSS gradient in the same palette.
- **Rangoli.** An SVG mandala made of petal rings, circles and dots. Lines draw themselves in with stroke-dash animation; the whole mandala turns slowly.
- **Kolam.** Two mirrored waves weave around a row of dots (a chain kolam). Used as a section and footer ornament.
- **CursorRing.** A gold ring that follows the pointer and grows over interactive things. It appears only for a fine pointer with hover and is turned off for reduced motion.
- **Reveal.** Headline lines rise out of a mask, and blocks fade up, when they enter the viewport (IntersectionObserver).

Scrolling is smooth via Lenis (native for reduced motion). GSAP is no longer used.

## 5. Pages

- **Landing (`/`):**
  1. Hero (revised 2026-10-17, see §8) over liquid photographs: "India, *unhurried.*", the Hindi line, a self-drawing rangoli, and a glass quick-plan search ("Where do you want to go?", "Plan my journey") with destination chips that fill the field.
  2. Journeys: the section pins while the destination cards (from the API) slide sideways; each card wipes open as it enters.
  3. How it works: three glass steps joined by a gold thread that draws itself.
  4. Sample trip: a glass itinerary sheet (Udaipur, 3 days, costs) over its own liquid band.
  5. Crew: shared plans, expenses and notes (marked "Coming soon").
  6. Closing: a kolam ornament, "Where to, यात्री?", and the call to action.
- **Login / Signup:** a split layout. On one side, liquid colour with the serif promise and the rangoli; on the other, a glass form card with a bilingual eyebrow (आगमन / प्रस्थान).
- **Passport:** a liquid header band and a passport card. Below it, a stamp page with a dashed empty state, then settings (theme switch, log out).
- **404 ("Lost luggage") / Coming soon / Route error:** liquid backdrop, rangoli, and a glass card.
- **Layout:**
  - **Navbar:** a floating glass pill with the Day/Night switch.
  - **Mobile:** a glass bottom tab bar.
  - **Footer:** kolam rule, links, credit.
  - **Server waking banner:** gold.

## 6. Motion rules

- **Easing.** Expo-out `cubic-bezier(.2,.8,.2,1)` for reveals; `cubic-bezier(.77,0,.18,1)` for wipes.
- **Theme change.** Colours cross-fade over 0.9 s.
- **Reduced motion.** No liquid animation, no rangoli spin, no wipes, no smooth scroll, no cursor ring. Content is shown immediately.

## 7. Kept unchanged

The API client, auth and its forms' logic, the mocks, the query client, the router and guards, the theme storage, and all non-UI tests.

## 8. Revision: the liquid photo hero

The first build kept the two halves apart: liquid colour in the hero, photography only in cards.
It read as "Liquid Monsoon with a serif", so the hero now fuses them.

- **Photos as the stage.** The hero is full-screen photography (Varanasi, Jaipur, Kerala, Ladakh) with a slow Ken Burns zoom.
- **Photos as water.** `PhotoLiquid` (`photoLiquidShader.ts`, `photoLiquidRenderer.ts`) displaces the photo's pixels:
  - a constant shimmer;
  - ripples under the pointer;
  - a liquid front that pours each new place in over the last (1.8 s), with a bright crest.
- **Grades.**
  - Day: warm dawn light.
  - Night: monsoon indigo, plus a lantern glow at the pointer and CSS rain over the photo.
- **Layout.**
  - Desktop: the photo melts into the page from the left, where the headline sits. A gold rangoli is drawn over the photo.
  - Phones: the photo fills the top 62% of the screen and the words start below it.
- **Navigation.** A slide index (01–04, with a gold progress line) and the place name in Hindi let visitors jump between places. Slides auto-advance every 7 s, but not with reduced or Calm motion.
- **Fallback.** Without WebGL, plain `<img>` stand-ins cross-fade instead. They are also what shows before the first water frame.
- **Shared code.** The WebGL helpers in `webgl.ts` are shared with the liquid colour field.
