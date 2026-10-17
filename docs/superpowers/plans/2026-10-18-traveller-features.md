<!--
  2026-10-18-traveller-features.md — implementation plan for Plan 2: the traveller features.
-->
# Traveller Features (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn TripWise from a landing page into a working trip planner in mock mode. Travellers can explore destinations, read a destination guide, plan a trip with a wizard, watch it generate, and get a day-by-day itinerary. They can download the itinerary as a PDF, share a read-only link, regenerate a day, delete it, see all their trips, and collect a passport stamp per trip.

**Architecture:**
- **Shared contract:** both the mock API (MSW) and the future backend use the contract in `src/lib/api/types.ts`, extended additively.
- **Mock AI:** a deterministic itinerary generator in `src/mocks/` builds plans from the request and the destination data, enforces a quota of 5 generations per day, and simulates `AI_UNAVAILABLE` on demand.
- **Data access:** TanStack Query hooks per feature.
- **Pages:** every page is glass over the living world.
- **Theming per trip:** a trip or destination in India shows its own world (the destination's `region`), without overwriting the traveller's remembered choice.

**Tech stack:** existing stack plus `@react-pdf/renderer` 4.x (free; lazy-loaded only when "Download PDF" is pressed).

**Spec:**
- `docs/superpowers/specs/2026-10-02-tripwise-frontend-design.md` §4 (pages), §5 (contracts), §7 (states)
- Look: `docs/superpowers/specs/2026-10-17-seven-worlds-design.md`
- Itinerary sheet reference: the landing page's former sample trip (timed stops, transfer lines, cost per day)

## Global Constraints

- **Free only.** Comments in every file, function and block. Never any Claude or co-author attribution.
- **Keep the plumbing.** Keep the API client, auth, guards, theme and world plumbing. Contract changes are additive only:
  - `Activity.startTime?`
  - `Activity.transfer?`
  - `Destination.region?`
- **Quota:** 5 generations per user per day. `QUOTA_EXCEEDED` shows a dialog with the reset time. `AI_UNAVAILABLE` shows "Both AI planners are busy — try again in a minute" with Retry.
- **Page states:** every list and page has loading (skeleton), empty (with a call to action) and error (with Retry) states.
- **Sizes:** must work at 390px, 1280×720 and 1920px.

## Review Focus

1. **Dates:** end date before the start date, or a trip longer than 14 days → the wizard blocks it with a clear message (tested in Task 3).
2. **Deep links:** opening `/trips/:id` for someone else's trip or a deleted one → "Trip not found" with a link to My trips, never a crash (Task 4).
3. **Share links:** an unknown `/t/:shareId` → a friendly not-found message; the shared page never shows Delete or Regenerate (Task 5).
4. **Quota:** the 6th generation in a day → a quota dialog with the reset time, and the wizard keeps its inputs (Task 3).
5. **Pre-filled destinations:** `/plan?destination=` with an unknown place → the wizard still works, because a free-text destination is allowed (Task 3).

---

### Task 1: Contract + mock itinerary API

**Files:**
- Modify: `src/lib/api/types.ts`, `src/lib/api/endpoints.ts`, `src/mocks/db.ts`, `src/mocks/data/destinations.ts` (add `region`), `src/mocks/handlers/index.ts`
- Create: `src/mocks/data/generator.ts`, `src/mocks/handlers/itineraries.ts`
- Test: `src/mocks/itineraries.test.ts`

**Interfaces:**
- **Types:**
  - `Activity.startTime?: string` ("09:30")
  - `Activity.transfer?: { mode: 'walk'|'auto'|'cab'|'bus'|'train'|'boat'; minutes: number }` (travel to the NEXT activity)
  - `Destination.region?: RegionKey`
  - `GenerateResponse { itinerary: Itinerary; quota: Quota }`
- **`itinerariesApi`:**
  - `generate(req: TripRequest)`
  - `list()` → `{ itineraries }`
  - `get(id)` → `{ itinerary }`
  - `remove(id)`
  - `regenerateDay(id, n)` → `{ itinerary }`
  - `share(id)` → `{ shareId }`
- **`shareApi.get(shareId)`** → `{ itinerary }`
- **`meApi.quota()`** → `{ quota }`
- **`generateItinerary(req, destination?, variant = 0): Omit<Itinerary,'id'|'createdAt'>`** in generator.ts:
  - Deterministic for the same input and variant.
  - Days = inclusive dates, 1–14.
  - 3 activities per day for `balanced`, 2 for `chill`, 4 for `packed`.
  - Start times: from 08:00 for `packed`, 09:30 for `balanced`, 10:00 for `chill`.
  - Transfers on every activity except each day's last.
  - Activities drawn from the destination's highlights plus interest-based templates.
  - Cost total ≈ `avgDailyCost × days × traveller factor` (solo 1, couple 1.8, friends 3.2, family 3.5), split stay 40 / food 25 / transport 15 / activities 20 percent.
  - Packing list and tips depend on the region and the months.
- **db:** `itineraries: (Itinerary & { ownerId: string })[]`, `generations: Record<userId, { day: 'YYYY-MM-DD'; used: number }>`.
- **Handler rules:**
  - Every endpoint needs a user except share.
  - `get` / `remove` / `regenerate` / `share` on a trip that isn't yours → 404 `NOT_FOUND`.
  - Each generate checks the quota (limit 5); over the limit → 429 `QUOTA_EXCEEDED` with `resetsAt` = next local midnight.
  - The destination text `"fail-ai"` → 503 `AI_UNAVAILABLE` (a test hook).
  - `generate` adds about 1.2 s of latency in the browser.

- [ ] **Step 1:** Write the failing tests:
  - generate returns N days for a 3-date range, with timed activities and transfers, and quota.used = 1;
  - the 6th call → 429 QUOTA_EXCEEDED;
  - list returns only the caller's trips;
  - another user's id → 404;
  - share returns an id that `GET /share/:id` resolves without auth;
  - regenerate day 2 changes only day 2;
  - delete removes the trip;
  - `"fail-ai"` → 503.
- [ ] **Step 2:** Run `npx vitest run src/mocks/itineraries.test.ts`. Expect FAIL.
- [ ] **Step 3:** Implement the types, endpoints, generator, db and handlers. Add regions: goa → konkan, manali → himalaya, jaipur → thar, kerala → konkan, ladakh → himalaya, varanasi → ganga.
- [ ] **Step 4:** Run the tests. Expect PASS.
- [ ] **Step 5:** Commit: `feat(frontend): itinerary contract and mock AI planner API (generate, trips, share, regenerate day, quota)`

### Task 2: Explore + destination guide

**Files:**
- Create: `src/features/explore/Filters.tsx`, `src/pages/ExplorePage.tsx`, `src/pages/DestinationPage.tsx`
- Modify: `src/features/explore/hooks.ts` (add `useDestination(slug)`), `src/router.tsx`
- Test: `src/pages/ExplorePage.test.tsx`

**Interfaces:**
- **Explore:** search, plus filter chips for world (the seven regions plus "World"), vibe, budget and month. Filters live in the URL (`?q=&vibe=&budget=&month=&world=`), so results can be shared and the back button works. Results are a grid of `DestinationCard`. World filtering is client-side via `region`, with "World" = no region.
- **Destination page:**
  - the photo as a hero;
  - Hindi name, summary;
  - a best-months chart (reuses the RegionGuide month scale: best = in bestMonths, others = 1);
  - highlights, average daily cost;
  - "Plan a trip here" → `/plan?destination=<name>`.
  - It shows its world via `setRegion(region)` without `fromUser`.
- **States:** an empty result shows "No places match — clear filters"; an unknown slug shows "Destination not found".

- [ ] **Step 1:** Write the failing tests:
  - the Explore page lists 12 destinations;
  - the "Beach" vibe filter narrows them and updates the URL;
  - the search "jai" shows Jaipur;
  - an impossible combination shows the empty state, and "Clear filters" restores the list;
  - `/destinations/goa` shows Goa, गोवा and a "Plan a trip here" link to `/plan?destination=Goa`;
  - `/destinations/nowhere` shows not found.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement and wire routes `explore` and `destinations/:slug`.
- [ ] **Step 4:** Run. Expect PASS.
- [ ] **Step 5:** Commit: `feat(frontend): Explore with shareable filters and the destination guide`

### Task 3: Planner wizard + generating screen

**Files:**
- Create: `src/features/planner/{schema.ts,PlannerWizard.tsx,steps.tsx,InterestPicker.tsx,GeneratingScreen.tsx,QuotaDialog.tsx,hooks.ts}`, `src/pages/PlanPage.tsx`
- Modify: `src/router.tsx`
- Test: `src/features/planner/PlannerWizard.test.tsx`

**Interfaces:**
- **`plannerSchema`** (zod), per step:
  - destination: non-empty;
  - dates: `end >= start`, at most 14 days, start not in the past;
  - budget: ≥ ₹500 per day, plus travellers;
  - interests: 1–5;
  - pace.
- **Wizard steps:** Destination → Dates → Budget & travellers → Interests → Pace → Review.
  - It shows a progress line and Back/Next buttons, and validates each step before moving on.
  - Pre-filled from `?destination=` and `?who=`, where who maps Just me → solo, Partner → couple, Friends / Backpacking → friends, Family → family.
- **`useGenerateItinerary()`:** a mutation. On success it invalidates the `['trips']` and `['quota']` queries and navigates to `/trips/:id`.
- **GeneratingScreen:** a full-panel glass card showing the destination's world. Messages rotate every 1.5 s ("Reading the season…", "Routing day 1…", "Pricing stays…"), and an indeterminate progress bar runs. It has `role="status"`.
- **Errors:**
  - `QUOTA_EXCEEDED` → `QuotaDialog` (a `role="dialog"` titled "You've planned 5 trips today"), showing the reset time.
  - `AI_UNAVAILABLE` → an inline alert with Retry.
  - In both cases the inputs are kept.

- [ ] **Step 1:** Write the failing tests:
  - `?destination=Goa` pre-fills the destination;
  - Next with an empty destination shows "Where would you like to go?";
  - end before start shows "End date must be on or after the start date";
  - 15 days shows "Trips can be up to 14 days";
  - zero interests are blocked;
  - the full happy path ends on `/trips/<id>`, with the itinerary title shown;
  - with the quota at 5 used → the dialog appears and the review step remains;
  - destination `fail-ai` → the AI-busy alert with Retry.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement. Wire the `plan` route (protected).
- [ ] **Step 4:** Run. Expect PASS.
- [ ] **Step 5:** Commit: `feat(frontend): planner wizard with step validation, generating screen, quota and AI-busy handling`

### Task 4: Itinerary view + My trips

**Files:**
- Create: `src/features/trips/{hooks.ts,ItineraryView.tsx,DayTimeline.tsx,CostBreakdown.tsx,TripCard.tsx,TripActions.tsx}`, `src/pages/TripsPage.tsx`, `src/pages/TripPage.tsx`
- Modify: `src/router.tsx`
- Test: `src/pages/TripPage.test.tsx`

**Interfaces:**
- **ItineraryView `{ itinerary, readOnly? }`:**
  - **Ticket header:** origin-less route chip → destination, dates, travellers, pace.
  - **Days:** a glass card per day, with a timeline of timed activities, transfer lines between them (icon per mode plus minutes), and a cost per day.
  - **Costs:** a breakdown as bars (stay, food, transport, activities) and the total.
  - **Also:** tips and the packing list.
- **TripActions** (hidden when `readOnly`):
  - Download PDF (Task 5);
  - Share;
  - Regenerate day N (a per-day button);
  - Delete, which confirms in a dialog and then goes to `/trips`.
- **TripsPage:** a grid of `TripCard` (destination photo or world thumbnail, title, dates, day count). It has an empty state with "Plan your first trip".
- **TripPage:** shows its world via `setRegion(itinerary.request` → destination's region). A missing trip shows "Trip not found" with a link to `/trips`.

- [ ] **Step 1:** Write the failing tests:
  - a generated trip shows its days, each with timed activities and transfer text like "12 min by auto";
  - the cost total is formatted in ₹;
  - "Regenerate day 2" changes day 2's theme only;
  - Delete → confirm → back on My trips with the trip gone;
  - an unknown id shows "Trip not found";
  - My trips is empty for a new user, then lists a generated trip.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement. Wire the `trips` and `trips/:id` routes.
- [ ] **Step 4:** Run. Expect PASS.
- [ ] **Step 5:** Commit: `feat(frontend): itinerary view (timed days, transfers, costs, tips, packing) and My trips`

### Task 5: Share link, shared page, PDF

**Files:**
- Create: `src/features/trips/{ShareButton.tsx,pdf/ItineraryPdf.tsx,pdf/downloadPdf.ts}`, `src/pages/SharedTripPage.tsx`
- Modify: `src/router.tsx`, `package.json` (`@react-pdf/renderer@4`)
- Test: `src/pages/SharedTripPage.test.tsx`

**Interfaces:**
- **ShareButton:** calls `share(id)` and builds `${origin}/t/${shareId}`. It uses `navigator.share` when available, otherwise the clipboard, then shows the toast "Link copied".
- **SharedTripPage `/t/:shareId`** (public): `ItineraryView readOnly` plus a "Plan your own" call to action. An unknown share id shows "This shared trip isn't available".
- **`downloadPdf(itinerary)`:** dynamically imports `@react-pdf/renderer` and `ItineraryPdf`, then saves `TripWise-<destination>-<start>.pdf`. The PDF has a title, dates, each day's activities with times, the costs and the packing list, in Helvetica (built in, no font download).

- [ ] **Step 1:** Write the failing tests:
  - Share copies a `/t/` link and shows the "Link copied" toast;
  - opening that link while logged out shows the itinerary without Delete or Regenerate buttons;
  - an unknown share id shows the not-available message;
  - Download PDF calls `downloadPdf` (the module is mocked in the test).
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement. Wire the `t/:shareId` route.
- [ ] **Step 4:** Run. Expect PASS. Then run `npm run build` and check that react-pdf is in its own lazy chunk, not the main bundle.
- [ ] **Step 5:** Commit: `feat(frontend): shareable read-only trips and PDF download`

### Task 6: Passport stamps + quota meter; verification

**Files:**
- Create: `src/features/passport/{StampGrid.tsx,QuotaMeter.tsx}`
- Modify: `src/pages/PassportPage.tsx`, `src/pages/PassportPage.test.tsx`, READMEs
- Test: `src/pages/PassportPage.test.tsx`

**Interfaces:**
- **StampGrid:** one `Stamp` per trip (destination name, Hindi name when known, tilt varied by index), each linking to the trip. When there are no trips it keeps the existing empty state.
- **QuotaMeter:** "x of 5 AI plans left today", plus the reset time, from `meApi.quota()`.

- [ ] **Step 1:** Write the failing tests: the passport shows the stamp "Goa" after generating a Goa trip, and "4 of 5 AI plans left today".
- [ ] **Step 2:** Run, implement, and run again. Expect PASS.
- [ ] **Step 3:** Run the full check: `npx tsc --noEmit && npx eslint . && npx vitest run && npm run build`.
- [ ] **Step 4:** Visual pass in Edge with playwright: Explore, destination, wizard, generating, trip (Day and Night), My trips, shared and passport, at 1920, 1280×720 and 390. No page errors.
- [ ] **Step 5:** Update the READMEs' feature table. Commit: `feat(frontend): passport stamps and daily AI quota meter; docs`
