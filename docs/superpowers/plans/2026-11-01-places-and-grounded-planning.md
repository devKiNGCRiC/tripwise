# Places & Grounded Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A committed places catalogue for ~40 Indian destinations, AI plans grounded in it, a free own
planner (fallback + Quick plan), and "Top places" on destination pages — real API and mock agree.

**Architecture:** an offline import script writes `backend/src/data/catalogue.json`
(destinations + places); `seed` loads it; a `places` service retrieves by destination + interests and
feeds the prompt; `localPlanner` builds trips without AI; routes and the frontend mock read the same JSON.

**Tech Stack:** as before. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-places-and-grounded-planning-design.md`

## Global Constraints
- Comment everything (file header + before every function/block). No Claude credit anywhere; commit to
  `main`, push only when the owner says so.
- Errors `{ error: { code, message } }`; real and mock APIs return identical shapes.
- Interests are the existing `Interest` enum: `food culture adventure nightlife nature shopping history
  relaxation photography spiritual`.
- Pace stops per day: chill 2, balanced 3, packed 4 (`ACTIVITIES_PER_DAY`).
- Own-planner provider value: `'tripwise'`.

## Review Focus
1. A destination typed differently ("hampi", "Hampi, Karnataka", "HAMPI ") still finds the catalogue.
2. A destination not in the catalogue: AI plans exactly as before; the own planner answers a clear 503,
   never a fake trip.
3. Fewer catalogue places than the trip needs: the own planner repeats nothing and makes shorter days.
4. AI answers that name a catalogue place loosely ("Vittala Temple" vs "Vitthala Temple, Hampi").
5. Photos without author/licence are dropped, never shown uncredited.

---

### Task 1: Import script and committed catalogue
**Files:** create `backend/scripts/catalogue/destinations.ts` (hand list), `backend/scripts/import-catalogue.ts`,
`backend/scripts/catalogue/classify.ts` + `classify.test.ts`; output `backend/src/data/catalogue.json`.
- `classify(typeLabels: string[]): { kind: PlaceKind; interests: Interest[] } | null` — allow-list mapping;
  null for administrative/irrelevant types. Tests: Hindu temple → temple/[spiritual,culture,history];
  village → null; waterfall → nature/[nature,photography,adventure].
- Script: per destination, Wikidata SPARQL `wikibase:around` (radius per destination), classify, drop
  duplicates by label, keep top 40 by sitelinks; resolve photo credits via the Commons API in batches of 50
  (drop photos with no author/licence); write JSON with `checked` date and `source` notes.

### Task 2: Catalogue in the API
**Files:** `backend/src/db/models/place.ts`, seed script reads `catalogue.json` (destinations + places),
`GET /api/destinations/:slug/places?interest=` (`{ places }`, 404 unknown slug), types; frontend
`destinationsApi.places`, MSW handler + mock data from the same JSON. Tests: route returns ranked places,
filter by interest, 404.

### Task 3: Retrieval + grounded prompt
**Files:** `backend/src/services/places.ts` (`findDestination(text)`, `placesFor(dest, interests, n)`),
`prompt.ts` (optional `places` list), `matchPlaces(activities, places)` attaching `place: { id, lat, lon }`.
Tests: name normalisation, interest ranking, prompt contains the list, fuzzy match.

### Task 4: Own planner + fallback + Quick plan
**Files:** `backend/src/services/localPlanner.ts`, itineraries routes: fallback when the chain fails,
`POST /itineraries/quick` (no quota), provider `'tripwise'`; frontend: QuotaDialog "Make a quick plan",
trip page credit line, mock mirrors. Tests: day count, no repeats, transfers, fallback keeps quota,
unknown destination → 503 `NO_CATALOGUE`.

### Task 5: Destination page "Top places" + docs
**Files:** frontend destination page section, README/ backend README notes, spec status. Tests: list
renders, interest filter, credits shown.
