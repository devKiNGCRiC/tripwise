# 128 Indian destinations with full guides (design)

**Date:** 2026-11-03 · **Status:** agreed with the owner (destinations chosen by the builder, added in
batches of about 20; no review of the list needed) · **Roadmap:** catalogue

## Why
TripWise has 44 Indian destinations and each page is mostly a summary, top places and a Wikipedia link.
The owner wants **128 Indian destinations** — mainly nature-heavy, from the North (Himalaya) and the
North-East first, then the rest of India — and every page to really describe the place: **about,
history, why it matters, things to do, local food** (plus the best time, which we already have).

## What gets built
1. **Guides for every destination** (the 44 now and every new one), stored in the catalogue
   (`backend/src/data/guides.json`) and served with the destination: `about` (2–3 short paragraphs),
   `history`, `significance`, `thingsToDo` (6–10: title + one line), `food` (4–8 local dishes: name + one
   line), `sources` (titles + links + licence), `checked` date.
2. **A richer destination page**: About · History · Why it matters · Things to do · Food to try ·
   Best time (existing) · Top places (existing) · a Sources line ("Text adapted from Wikivoyage and
   Wikipedia, CC BY-SA 4.0").
3. **84 new destinations in 4 batches** (20, 20, 20, 24): Himalaya and North-East first, then the rest
   of India — bases where travellers stay (a spot like Yumthang is a place inside Lachung, not its own
   destination). Each comes with its places (Wikidata), a credited photo, and a guide.

## How guides are written (accuracy first)
- **Grounded, not invented.** For each destination we fetch the plain text of its **Wikivoyage** page
  (written as See / Do / Eat — ideal for travel) and its **Wikipedia** page (history). The AI (our free
  Gemini → Groq chain) writes short, original sections **only from those texts**, once, offline.
- **Checked by code** before it's saved: every section present and within length; every dish and every
  thing-to-do title must actually appear in the source text (else it's dropped; too few left → the guide
  is rejected and retried or flagged); no prices, phone numbers or business names in food.
- **Checked by a person**: a sample from each batch is read before it's committed.
- **Licence:** both sources are CC BY-SA 4.0 (commercial use allowed with credit and share-alike for the
  adapted text) — each page credits them with links; the guides file states the licence.
- Requests name TripWise with the repository link (User-Agent), never anyone's email.

## Non-goals
Restaurant listings, hotel prices, live info (opening hours, road status), languages other than English.

## Builder's calls
- Destinations with too few catalogue places (fewer than 6) get key nature spots added by hand (treks,
  lakes, falls) with coordinates from Wikidata/Wikipedia, so the planner has enough.
- The demo mock serves the same `guides.json` (through `@catalogue`), so demo and real pages match.
