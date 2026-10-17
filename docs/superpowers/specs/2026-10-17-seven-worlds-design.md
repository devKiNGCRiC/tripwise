<!--
  2026-10-17-seven-worlds-design.md — design for the "Seven Worlds" UI rewrite.
  Approved from the prototype docs/design/tripwise-living.html.
-->
# Seven Worlds: living-landscape UI rewrite

**Status:** approved (from prototype `docs/design/tripwise-living.html`)
**Replaces:** the Monsoon Editorial look (`2026-10-17-monsoon-editorial.md`)

## 1. Intent

TripWise is a trip planner rooted in India, open to the world, and for every kind of traveller: solo travellers, friends, backpackers, families and couples. It should also draw in people who don't think of themselves as travellers.

Earlier designs each picked one "India" and were judged basic, static or disconnected. This design embraces how different India's landscapes are.

The owner's own travel shapes the defaults: Badrinath, Mana, the Valley of Flowers, Hemkund and Rishikesh, so mountains and ancient history.

### Goals

- **A living background.** It is never static: an illustrated landscape drawn live, in layers that move with the pointer and with scrolling.
- **Seven regions by landscape, not state names.** Each region has its own terrain, weather, life, colours, words and facts:
  - Himalaya
  - Thar
  - Gangetic Plains
  - Deccan Plateau
  - Western Ghats
  - Konkan & Malabar
  - Seven Sisters
- **Day and Night for every region.** Night is a real night: stars, moon, diyas, fireflies, lit windows.
- **A richer, layered glass interface.** It is deliberately more detailed than a minimal landing page.
- **Personalisation:**
  - the region you last chose is remembered;
  - "Use my location" picks the nearest region;
  - a trip photo can tint the whole world (read on the device, never uploaded).

### Non-goals

- Real photography as the main background (photos stay in destination cards).
- 3D libraries.
- Drawing an outline map of India (border depictions are sensitive).

### Anti-goals

These would make it a failure even if it works:

- a static or flat page;
- text that can't be read over the scene;
- jank on ordinary laptops;
- anything that breaks login, routing or the API layer.

## 2. Constraints

- Free only: Fontsource fonts, no paid services.
- Keep the plumbing unchanged: API client, auth, mocks, router and guards, query client, theme storage key (`tw_theme`, `light`/`dark`), the Calm motion preference (`tw_motion`).
- Comments in every file, function and block, as the owner requested.
- No Claude or co-author attribution anywhere.
- Must work at 1280×720 and 1366×768 laptops, large monitors, and phones (390px).
- Reduced motion or Calm: the world holds a single still frame, with no auto-tour and no reveals.

## 3. The world (decided)

### Engine

- **Renderer:** a Canvas 2D renderer (no WebGL needed), full-screen and fixed behind every page.
- **Terrain:** made of layers. Each has a shape (mountains, rounded mountains, hills, dunes, plateau, flat), a base line, an amplitude, a frequency, a seed, day and night colours, and a parallax depth.
- **Decorations:**
  - pines, canopy, temples (the ghat skyline with shikharas, flags and night windows);
  - a fort, a camel caravan, ruins, boulders, waterfalls;
  - tea terraces, palms;
  - snow caps.
- **Special layers:** mist bands, water (ripples, a sun or moon path, breaking waves at sea), blowing sand.
- **Sky life:**
  - stars that twinkle;
  - the sun or a crescent moon with a glow;
  - birds (day) and colourful kites (Gangetic Plains, day).
- **Front weather and life:** snow, rain, fireflies, diyas, boats, glitter.

### Behaviour

- **Parallax:** pointer x/y shifts each layer by its depth; scrolling raises nearer layers more than far ones.
- **Region change:** the old world cross-fades into the new one over about 1.4 s.
- **Day/Night:** colours, sky and effects ease between the two.
- **Photo tint:** a `color` blend over the scene at about 38%.
- **Performance:**
  - device pixel ratio capped at 1.5;
  - pauses when the tab is hidden;
  - region thumbnails are drawn once per region on demand.
- **Fallbacks:**
  - no canvas, as in tests: a CSS sky gradient in the region's colours stays behind the page;
  - Calm or reduced motion: one still frame, redrawn only on resize, region change or theme change.

### Region data

All seven regions use the content from the prototype:

- name and Hindi name;
- headline with an italic accent phrase, and a lede;
- elevation, terrain, best months, and a 12-month score (1–3);
- three signature experiences and five places;
- UI accent colours (day and night pairs), sky colours, sun position, layers and effects.

## 4. Interface (decided)

### Look

- **Fonts:** Fraunces (variable: opsz, SOFT) for headlines, Plus Jakarta Sans for the interface, Tiro Devanagari Hindi for Hindi. All self-hosted through Fontsource.
- **Glass:**
  - Day: white at 52% (strong variant 72%), a white edge, 22px blur.
  - Night: indigo at 42% (strong variant 66%).
- **Colour:** ink and soft-ink tokens per theme; the accent and second accent follow the current region (or the photo palette).
- **Readability:** a soft left-hand scrim behind the hero (a top scrim on phones).

### Every page

- **Navbar:** a glass pill with logo (arch mark), links, the Day/Night button and account.
- **Mobile tab bar:** glass.
- **Footer:** a glass bar.

### Landing (`/`)

1. **Hero:**
   - eyebrow: "01 / 07", the region name, its Hindi name;
   - headline and lede, which animate in on change;
   - planner bar: Where (placeholder lists the region's places), When, Who's going, a budget-per-day slider, and **Plan**. It goes to `/plan?destination=…` (through login for guests).
   - traveller chips.
2. **Region dossier** (glass): elevation, terrain and best time; a 12-month chart with the current month marked; signature experiences; places.
3. **Region bar:** seven buttons, each with a mini landscape thumbnail, name and Hindi name. Auto-tour every 10 s with a progress line; it stops for good once the user picks a region.
4. **"However you travel, it bends to you":** five cards (Solo, Friends, Backpackers, Family, Couples). The selected card widens and lists what changes for that traveller, synced with the hero chips and the planner's "who".
5. **"One India. Seven worlds.":** an intro card plus seven world cards with thumbnails; clicking switches the world and scrolls to the top.
6. **"Your trip. Your palette.":** choose or drop a photo, see four swatches, "Use my location", and "Reset colours".

### Other pages

These sit on the same living world, inside glass cards:

- Login and Signup (bilingual eyebrows आगमन / प्रस्थान);
- Passport (details, stamp page, Motion setting, theme switch, log out);
- 404 ("Lost luggage"), Coming soon, the route error page, and the admins-only screen.

## 5. Left to the builder

- Exact file structure. Suggested: `src/world/` for the engine, data and provider; `features/landing/` for the sections.
- Exact spacing and type sizes. Display type is clamped by both width and height, so laptops fit the hero.
- Which old Monsoon Editorial pieces to delete. Anything the new design doesn't use goes.
- How tests are restructured, as long as behaviour is covered:
  - region switching;
  - auto-tour stopping;
  - the planner hand-off;
  - traveller selection;
  - nearest region;
  - palette extraction from pixels;
  - month formatting;
  - Calm mode;
  - auth, routing and passport flows.

## 6. Calls made while writing this (builder's, not the owner's)

- **Where the region lives:** one `WorldProvider` holds the current region, the photo tint and the auto-tour, so every page shares the same living world. The chosen region is remembered in `localStorage` (`tw_region`).
- **First visit:** opens on **Himalaya**, the owner's own favourite. Location is only used when the visitor presses "Use my location", never automatically.
- **Auto-tour:** runs on the landing page only. Other pages keep the remembered region.
- **Planner hand-off:** still sends only the destination (`/plan?destination=…`). "Who" and budget are passed along once the real planner page exists.
- **Photo tint:** lasts for the visit only, not saved. Saving it to the user's passport comes with the photos feature.
