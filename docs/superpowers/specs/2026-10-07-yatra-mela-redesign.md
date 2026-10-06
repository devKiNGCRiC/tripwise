# TripWise — "Yatra Mela" Redesign: Spec & Plan

**Date:** 2026-10-07
**Status:** Approved by the user. The look was approved via `docs/design/yatra-mela-preview.html`.
**Replaces:** §3 "Passport Pop" of `2026-10-02-tripwise-frontend-design.md`. That spec's pages, contracts and architecture still apply.

## 1. Design

**Idea.** The page borrows the visual language of Indian journeys:
- railway departure boards
- truck-art colour
- the Uttarayan kite sky (day) and sky lanterns (night)
- festival bunting and rangoli dots

There is one signature element: the **departure-board headline**. Everything around it stays disciplined.

**Colours.** Each colour has one job, and every value lives in `src/theme/tokens.css`.

| Token | Day | Job |
|---|---|---|
| `saffron` → `orange` | `#FF9933` → `#FF7A00` | Brand gradient: main buttons, logo |
| `yellow` | `#FFC72C` | Station boards, highlights, selected chips, active nav |
| `sky` / `sky-deep` | `#5BC8F5` / `#1B8FD1` | Hero sky, AI aurora / focus rings, links |
| `green` / `green-deep` | `#9BE08A` / `#2F9E55` | Saved, success, budget |
| `red` / `danger` | `#E63946` / `#C81E2D` | Alerts, hot deals / error text (AA on white) |
| `ink` / `paper` | `#000` / `#FFF` | Text and outlines / page |
| `paper-2` | `#FFF4E0` | Warm alternate sections |

**Night Flight** is a deep navy page (`#0A0F24`). The sky has stars and rising lanterns, a moon replaces the sun, and the outlines and shadows are cream-coloured.

**Fonts.**
- **Anybody** (variable width): display and headings, weight 800–900, stretched to 115–140% width. Buttons stretch wider on hover.
- **Mukta** (by Ek Type, India): body text and Devanagari. Weights: 400 body, 600 UI, 800 Hindi on boards.
- **No monospace anywhere.**

**Rules from the design review.** The UI must not contain any of these:
- all-caps eyebrow labels
- `A · B · C` meta strings
- `→` appended to buttons
- one coloured word in a headline
- identical card grids

Numbered markers are allowed only for the real sequence ("How it works").

**Motion.**
- **The orchestrated moments:** the board's flip letters and the sky. The kites sway, and the lanterns rise at night.
- **User-triggered motion:** card tilt, ticket flip, stamp thump and the train moving between stations.
- **Reduced motion:** everything stops, the board shows a static name, and the globe renders once.

**3D.** A Three.js globe with India facing the viewer, glowing flight routes and a plane.
- **When it loads:** lazily, after first paint.
- **Fallback:** a static CSS globe whenever WebGL is unavailable, the screen is under 640px wide, or reduced motion is set.
- **Texture:** the NASA Blue Marble (public domain), hosted locally at `public/textures/earth.jpg`.

**Data contract change.** `Destination` gets `localName?: string`, the Hindi name shown on station signs (e.g. "गोवा").

## 2. Plan (executed inline, tests first)

| # | Task | Tests |
|---|---|---|
| 1 | New tokens and fonts (Anybody, Mukta). Rename token utilities (`coral`→`saffron`, `mustard`→`yellow`, `teal`→`green-deep`, `violet`→`sky-deep`). Drop `font-mono` usages. | Existing suite stays green |
| 2 | `DepartureBoard`: flip letters cycle through names, with the Hindi line underneath. The accessible name updates. Static under reduced motion. | New unit tests |
| 3 | `FestivalSky` (sun/moon, kites, lanterns, stars), `Bunting` divider, rangoli dot section background. All decorative (`aria-hidden`). | Renders as decoration only |
| 4 | `Globe`: lazy Three.js scene with a CSS fallback. | Fallback renders where WebGL is missing (jsdom) |
| 5 | Landing rebuild: hero (board, headline, plan form, globe, floating chips), "How it works" as a railway route with a moving train, station-sign destination cards with 3D tilt, closing CTA. Add `localName` to seed data. | Updated landing tests |
| 6 | Restyle the shared chrome: navbar/logo, auth layout (board header + kite panel), passport page (stamp page), Ticket, Stamp, Toast, footer, 404, coming-soon. | Existing tests stay green |
| 7 | Verify: lint, typecheck, tests, build, real-browser screenshots (desktop, phone, night), README update, final review. | Full suite |
