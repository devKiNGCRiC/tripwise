# Toli Part 3a — Together on the Trip · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the trip, a Toli can split a day into Dharas that meet again at a Sangam (with an "I'm here"
headcount), Sahyatris can choose to share where they are for a limited time, families get a private Kushal
link showing the traveller's latest check-in, and the Toli keeps shared notes and a Potli (packing list) —
real API and demo mock agreeing, at zero running cost.

**Architecture:**
- **Pure rules** (`backend/src/services/yatraRules.ts`, no runtime imports; website alias `@yatra-rules`):
  nearest catalogue place to a position, rounding a position for Kushal, when location sharing ends, and the
  Sangam headcount. The catalogue (`@catalogue/places.json`, 1,028 places with coordinates) names where
  someone is ("near Alleppey Lighthouse, 1.2 km") — no paid maps, no reverse-geocoding service.
- **Backend:** new collections `ToliSplit` (a day's Dharas + Sangam, or fixed Dharas for the whole trip),
  `ToliLocation` (one last-known point per sharer, removed by a TTL index when sharing ends), `ToliNote`,
  `PotliItem`, `KushalContact`, `KushalCheckIn` (latest only). Routes `routes/yatra.ts` (Toli) and
  `routes/kushal.ts` (personal + the public link).
- **Frontend:** Dharas, Sangam and Notes on the Sahyatra tab; "Where are my Sahyatris?" on the Sahyatris tab;
  a new **Potli** tab; a **Kushal** page (`/kushal`) and the family's public page (`/kushal/:token`);
  automatic check-ins while TripWise is open (like `AccountThemeSync`, a renderless `KushalSync`).

**Tech Stack:** as Parts 1–2. No new dependencies (positions come from the browser's Geolocation API;
"Open in Maps" is a plain `https://www.google.com/maps?q=lat,lon` link the phone opens in its maps app).

**Spec:** `docs/superpowers/specs/2026-11-01-toli-design.md` (Part 3 items 15–17, 19, 20).
Part 3b (album, voice notes, offline trip — items 18, 21, 22) is a separate plan.

## Global Constraints
- Comment everything; no AI credit anywhere; commit to `main`; push only when the owner says so.
- Errors as before: non-members 404, above your role 403, state clashes 409 `CONFLICT`, bad input 400.
- **Location is opt-in, per person, time-limited** (spec anti-goal): only I can start or stop my sharing;
  choices `'1h' | 'sangam' | 'trip'` (until today's Sangam / until the Sahyatra's last day ends; `sangam` and
  `trip` are refused with 409 when there is no Sangam today / no Sahyatra). Only the last known point is
  stored (no history); it is deleted when sharing ends (TTL index on `until`) or is stopped; visible only to
  the Toli's current members. The web app updates the position only while TripWise is open (spec item 16).
- **Kushal links** need no account: a random 24-character token per contact, revocable; the page shows only
  the traveller's first name, the latest check-in's place name and time, and a position rounded to 2 decimals
  (about 1 km). No history, no other data. Automatic check-ins only when the traveller turned them on and
  TripWise is open, at most every 30 minutes. "Send Kushal on WhatsApp" prefills `https://wa.me/?text=…`.
- Names (Indian / English via `useWords`): Dhara / Split group, Dharas / Split groups, Sangam / Meet-up,
  Kushal / Family check-in, Potli / Packing list. Each Indian name first appears with its English line.
- Limits: Dhara name 1–40 chars, 2–6 Dharas per split, stops 0–8 per Dhara (titles ≤ 120); Sangam place
  1–120 chars; note 1–500 chars; Potli item 1–80 chars; 5 Kushal contacts (name 1–40); check-in note ≤ 140.
- Polling: Toli screens 10 s; the Sangam headcount and locations 10 s while open.
- Demo people keep Hindu names; the demo Kushal contact is "Maa".

## Review Focus
1. Someone reading another's location after sharing ended, after leaving the Toli, or from outside the Toli — expect nothing (404 outside; absent inside). → Task 3.
2. A Kushal link after it was revoked, or a guessed token — expect 404 with no traveller details. → Task 5.
3. The Kushal page showing more than allowed (full coordinates, history, email, other trips) — expect only first name, place, time, rounded position (assert the JSON). → Task 5.
4. Joining two Dharas of the same split, or "I'm here" from someone not in the Toli — expect one Dhara (moving, not doubling) and 404. → Task 2.
5. A leader deleting a split whose Sangam people already checked in to — allowed, logged; Sahyatris can't (403). → Task 2.

---

### Task 1: Pure on-the-trip rules (shared by API and mock)
**Files:** Create `backend/src/services/yatraRules.ts`; Test `backend/test/yatraRules.test.ts`.

**Interfaces — Produces:**
- `nearestPlace(lat: number, lon: number, places: { name: string; lat: number; lon: number }[]): { name: string; km: number } | null` — haversine; `km` to one decimal; null for an empty list.
- `roundPosition(lat: number, lon: number): { lat: number; lon: number }` — 2 decimals.
- `mapsLink(lat: number, lon: number): string` → `https://www.google.com/maps?q=${lat},${lon}`.
- `type ShareFor = '1h' | 'sangam' | 'trip'`; `sharingUntil(choice: ShareFor, nowIso: string, sangamAt?: string | null, tripEndIso?: string | null): string | null` — `1h` = now + 60 min; `sangam` = that time (null if missing or past); `trip` = end of the last day (null if missing or past).
- `headcount(memberIds: string[], here: string[]): { here: string[]; missing: string[] }` — members only, in member order.
- `isValidPosition(lat: unknown, lon: unknown): boolean` — finite numbers in range.

- [ ] **Step 1: Write the failing tests:** Kochi (9.9312, 76.2673) against [Fort Kochi beach (9.9658, 76.2421), Alleppey Lighthouse (9.4955, 76.3268)] → `{ name: 'Fort Kochi beach', km: 4.7 }` (check the exact km with the formula in the test, to one decimal); empty list → null; `roundPosition(9.93124, 76.26731)` → `{ lat: 9.93, lon: 76.27 }`; `sharingUntil('1h', '2026-11-02T10:00:00.000Z')` → `'2026-11-02T11:00:00.000Z'`; `'sangam'` with a past time → null; `headcount(['a','b','c'], ['c','x'])` → `{ here: ['c'], missing: ['a','b'] }`; `isValidPosition(91, 0)` false, `(NaN, 0)` false, `(9.9, 76.2)` true.
- [ ] **Step 2–4:** FAIL (module missing) → implement → PASS (file, backend suite, tsc).
- [ ] **Step 5: Commit** `feat(backend): on-the-trip rules — nearest place, rounded positions, how long sharing lasts, Sangam headcount`.

### Task 2: Dharas and Sangam (API)
**Files:** Create `backend/src/db/models/toliSplit.ts`, `backend/src/routes/yatra.ts` (mounted in `app.ts`); Test `backend/test/dharas.test.ts`.

**Interfaces:**
- Model `ToliSplit { toliId, day: number | null /* null = fixed for the whole trip */, dharas: [{ _id, name, stops: string[], memberIds: string[], leadId?: string }], sangam?: { place: string; at: Date }, here: string[], status: 'proposed' | 'active', createdBy, createdAt }`.
- `POST /tolis/:id/splits { day | null, dharas: [{ name, stops? , leadId? }], sangam? }` → 201 `{ split }` — leaders create `active`; a Sahyatri's is `proposed` (the spec's "via Sujhav": leaders then `POST …/splits/:sid/approve` or `DELETE`). `day: null` (fixed Dharas: Bus 1, Section A) only for college/office Tolis and needs no Sangam; a day split needs a Sangam.
- `GET /tolis/:id/splits?day=n` → `{ splits: SplitView[] }` (`SplitView` adds `headcount { here: ToliPerson[], missing: ToliPerson[] }` and each Dhara's members as people).
- `POST /tolis/:id/splits/:sid/dharas/:did/join` (and `/leave`) — me only; joining one Dhara leaves any other in the same split.
- `POST /tolis/:id/splits/:sid/here` / `DELETE …/here` — "I'm here" at the Sangam.
- `DELETE /tolis/:id/splits/:sid` — leaders (or the proposer while `proposed`).
- Activity: `split-created { day }`, `sangam-here { day }` (only the first "here" per person).

- [ ] **Step 1: Write the failing tests:** a leader splits day 2 into "Beach" and "Fort" meeting at "Boat jetty, 5 pm"; Rohan joins Beach then Fort → he's only in Fort; "I'm here" → headcount here [Rohan], missing the rest; a Sahyatri's split is `proposed` until a leader approves; Sahyatri deleting an active split → 403; a day split without a Sangam → 400; fixed Dharas in a friends Toli → 400, in an office Toli → 201 with a lead; outsiders → 404 everywhere.
- [ ] **Step 2–4:** FAIL → implement → PASS (file + backend suite + tsc).
- [ ] **Step 5: Commit** `feat(backend): Dharas and Sangam — split a day, meet again, "I'm here" headcount; fixed Dharas for college and office`.

### Task 3: "Where are my Sahyatris?" (API)
**Files:** Create `backend/src/db/models/toliLocation.ts` (TTL index `{ until: 1 }, { expireAfterSeconds: 0 }`), Modify `backend/src/routes/yatra.ts`; Test `backend/test/locations.test.ts`.

**Interfaces:** Consumes `sharingUntil`, `nearestPlace`, `isValidPosition`, `mapsLink`.
- `PUT /tolis/:id/location { lat, lon, accuracy?, for?: ShareFor }` — `for` starts sharing (sets `until`); without `for` it only updates the point of an existing share (409 if not sharing). → `{ sharing: { until } }`.
- `DELETE /tolis/:id/location` → 204 (deletes the record).
- `GET /tolis/:id/locations` → `{ me: { until } | null, locations: [{ person, near: { name, km } | null, at, until, mapsLink }] }` — only unexpired, only current members (check `until > now` in the query too: TTL deletion runs about once a minute). Places come from the Sahyatra's destination when known, else the whole catalogue.
- Leaving the Toli deletes my location (Modify the member delete route).

- [ ] **Step 1: Write the failing tests:** Rohan shares for 1 hour → Asha sees him near a catalogue place with `mapsLink`; after the clock moves 61 min he's gone; updating without sharing → 409; `sangam` with no Sangam today → 409; Asha can't see a non-member's location and an outsider gets 404; after Rohan leaves the Toli his location is gone; bad positions → 400.
- [ ] **Step 2–4:** FAIL → implement → PASS (file + backend suite + tsc).
- [ ] **Step 5: Commit** `feat(backend): where are my Sahyatris — opt-in, time-limited, last point only, Toli only`.

### Task 4: Notes and Potli (API)
**Files:** Create `backend/src/db/models/toliNote.ts`, `backend/src/db/models/potliItem.ts`; Modify `backend/src/routes/yatra.ts`; Test `backend/test/notesPotli.test.ts`.

**Interfaces:**
- Notes: `GET /tolis/:id/notes` → `{ notes }` (trip-wide `day: null` first, then by day); `POST { text, day? }` → 201; `PATCH/DELETE /tolis/:id/notes/:nid` — author or leaders. `NoteView { id, text, day: number | null, author: ToliPerson, canEdit, updatedAt }`.
- Potli: `GET /tolis/:id/potli` → `{ group: PotliView[], mine: PotliView[] }` (`mine` = my own private list, never shown to others); `POST { text, mine?: boolean }`; `POST …/potli/:pid/claim` / `DELETE …/claim` (group items: "I'll bring it"; one claimer); `PATCH …/potli/:pid { packed?: boolean }` (claimer or owner); `DELETE` (whoever added it, or leaders for group items). `PotliView { id, text, claimedBy: ToliPerson | null, packed, canDelete }`.

- [ ] **Step 1: Write the failing tests:** add a trip note and a day-2 note, order is trip-wide first; Priya can't edit Asha's note (403), the Sutradhar can; Potli: Rohan claims "Speaker", Priya's claim of it → 409 until he unclaims; my own list item isn't in anyone else's `GET` (assert JSON text); packed toggled only by the claimer; outsiders 404.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(backend): Toli notes and Potli — shared notes per trip and day, packing that someone claims`.

### Task 5: Kushal — family check-in (API)
**Files:** Create `backend/src/db/models/kushal.ts` (`KushalContact`, `KushalCheckIn`), `backend/src/routes/kushal.ts`; Modify `backend/src/db/models/user.ts` (`kushalAuto: boolean`, default false), `app.ts`; Test `backend/test/kushal.test.ts`.

**Interfaces:**
- `GET /me/kushal` → `{ contacts: [{ id, name, link, createdAt }], auto: boolean, latest: { place, at, note? } | null }`; `POST /me/kushal/contacts { name }` → 201 (max 5); `DELETE /me/kushal/contacts/:cid` (revokes: the link 404s from then on); `PATCH /me/kushal { auto }`.
- `POST /me/kushal/checkin { lat?, lon?, note? }` → `{ latest }` — place = nearest catalogue place within 50 km, else "Somewhere without a nearby landmark"; stores only the latest (upsert), keeps the rounded position.
- Public, no login: `GET /kushal/:token` → `{ kushal: { traveller: firstName, latest: { place, at, note?, position?: { lat, lon }, mapsLink? } | null } }`; unknown/revoked → 404 "This Kushal link isn't active.". Rate-limited like other public routes.

- [ ] **Step 1: Write the failing tests:** add "Maa" → a link `…/kushal/<24 chars>`; the public page shows "Asha" and no check-in yet; check in near Kochi → the page shows the nearest place, time and a rounded position (assert JSON has exactly the keys above and `lat` with ≤ 2 decimals, and contains neither the email nor the unrounded number); a second check-in replaces the first; revoking → 404; a sixth contact → 409; `PATCH auto` saves.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5: Commit** `feat(backend): Kushal — private family links showing only the latest check-in`.

### Task 6: Website API layer, words and demo mock
**Files:** Modify `frontend/vite.config.ts` + `tsconfig.json` (`@yatra-rules`), `frontend/src/lib/api/types.ts`, `endpoints.ts` (`toliApi.splits/createSplit/approveSplit/deleteSplit/joinDhara/leaveDhara/here/notHere`, `locations/shareLocation/updateLocation/stopSharing`, `notes/addNote/editNote/deleteNote`, `potli/addPotli/claim/unclaim/setPacked/deletePotli`; `kushalApi.mine/addContact/revoke/setAuto/checkIn/view`), `frontend/src/features/words/words.ts` (`dhara`, `dharas`, `sangam`, `kushal`, `potli` + English), mock data + `mocks/handlers/yatra.ts` + `mocks/handlers/kushal.ts`; Test `frontend/src/lib/api/yatra.test.ts`.

Seed for "Kerala Toli": day 2 split "Backwater walk" (Demo, Ananya) and "Fort Kochi" (Raj) meeting at "Boat jetty" at 17:00 on the trip's day 2; Raj sharing his location for 1 hour near Fort Kochi; notes "Homestay owner: Ramesh (ask at the gate)" (trip) and "Carry sunscreen" (day 1); Potli "First-aid kit" (claimed by Raj), "Speaker" (unclaimed), Demo's own "Charger"; Demo's Kushal contact "Maa" with token `maaKUSHALdemo2026xxxxxx`.

- [ ] **Step 1: Write the failing tests** (through the clients against the mock): joining a Dhara moves you; "I'm here" changes the headcount; Raj's location is visible to Demo and gone after `stopSharing` as Raj; Demo's own Potli item isn't in Ananya's view; the public Kushal view of the seeded token has only `traveller` and `latest`.
- [ ] **Step 2–4:** FAIL → implement → PASS, then the whole frontend suite.
- [ ] **Step 5: Commit** `feat(frontend): on-the-trip API client, words and demo mock`.

### Task 7: Dharas, Sangam and Notes on the Sahyatra tab
**Files:** Create `frontend/src/features/toli/yatra/DayDharas.tsx` (per day: the split's Dharas with stops and members, Join / Leave, the Sangam place and time, "I'm here" with "Here: 2 of 3 · Missing: Raj Roy" for leaders, a banner when the Sangam is within 30 minutes), `yatra/SplitForm.tsx` (leaders: create; Sahyatris: "Suggest a split", pending approval), `yatra/FixedDharas.tsx` (college/office), `yatra/Notes.tsx`; Modify `features/toli/SahyatraTab.tsx`; Test `frontend/src/features/toli/yatra/Dharas.test.tsx`.

- [ ] **Step 1: Write the failing tests:** day 2 shows "Backwater walk" and "Fort Kochi" with "Sangam · Boat jetty, 5 pm" (English mode: "Meet-up"); Demo joins Fort Kochi and leaves Backwater walk; "I'm here" → "Here: 1 of 3"; Ananya suggests a split → "Waiting for a leader"; notes: add a day-1 note, edit own, no edit button on others' (as a Sahyatri).
- [ ] **Step 2–4:** FAIL → implement → PASS (+ suite, tsc, eslint).
- [ ] **Step 5: Commit** `feat(frontend): Dharas and Sangam with headcount, and shared notes, on the Sahyatra tab`.

### Task 8: "Where are my Sahyatris?" on the Sahyatris tab
**Files:** Create `frontend/src/features/toli/yatra/WhereAreWe.tsx` (my sharing: Share for 1 hour / until the Sangam / until the trip ends, Stop sharing, "Sharing until 6:40 pm"; while sharing and the tab is open, `navigator.geolocation.watchPosition` sends updates at most once a minute; the list: "Raj Roy · near Fort Kochi beach (0.4 km) · 3 min ago · Open in Maps"); Modify `SahyatrisTab.tsx`; Test `yatra/Where.test.tsx` (stub `navigator.geolocation`).

- [ ] **Step 1: Write the failing tests:** Raj appears with "near" text and an Open in Maps link to `google.com/maps?q=`; Demo shares for 1 hour (stubbed position) → "Sharing until …" and the mock has Demo's point; Stop sharing removes it; with geolocation refused → "Allow location to share where you are" and nothing is sent.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ suite, tsc, eslint).
- [ ] **Step 5: Commit** `feat(frontend): where are my Sahyatris — share for a while, see who's near where`.

### Task 9: The Potli tab
**Files:** Create `frontend/src/features/toli/yatra/PotliTab.tsx` (group items with "I'll bring it" / "Raj brings it" / packed ✓; my own private list); Modify `labels.ts` (`TAB_KEYS` adds `'potli'` after `'lekha'`, label `w.potli`), `ToliPage.tsx`, `Words.test.tsx` (English tabs add "Packing list"); Test `yatra/Potli.test.tsx`.

- [ ] **Step 1: Write the failing tests:** "First-aid kit — Raj Roy brings it"; Demo claims "Speaker" → "You bring it", ticks packed; adds "Torch" to the group and "Medicines" to "Only my list" → Ananya sees Torch but not Medicines or Charger.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ suite, tsc, eslint).
- [ ] **Step 5: Commit** `feat(frontend): Potli — the Toli's packing list that someone claims, and my own`.

### Task 10: Kushal pages and automatic check-ins
**Files:** Create `frontend/src/pages/KushalPage.tsx` (`/kushal`, protected: contacts with Copy link / Send on WhatsApp / Remove, "Check in now", the automatic switch with the plain promise "only while TripWise is open; never in the background"), `frontend/src/pages/KushalViewPage.tsx` (`/kushal/:token`, public: "Asha is near Fort Kochi beach · 10 min ago · Open in Maps", or "No check-in yet", or "This Kushal link isn't active"), `frontend/src/features/kushal/KushalSync.tsx` (renderless, in `RootLayout`: when signed in, `auto` is on and the page is visible, check in on open and every 30 minutes); Modify `router.tsx`, the passport page (a "Kushal · family check-in" card) and `ToliHeader.tsx` (a "Kushal" button); Test `frontend/src/pages/Kushal.test.tsx`.

- [ ] **Step 1: Write the failing tests:** Demo adds "Papa" → a link and a WhatsApp button whose text contains the link; "Check in now" (stubbed position) → "Last check-in: near …"; the public page for the seeded token shows "Demo is near …" and no email; a revoked link shows "This Kushal link isn't active"; with auto on, rendering the app checks in once (mock receives one check-in), and not when auto is off.
- [ ] **Step 2–4:** FAIL → implement → PASS (+ suite, tsc, eslint) + browser screenshots at 1536 and 390 (all new screens; show the owner).
- [ ] **Step 5: Commit** `feat(frontend): Kushal — family links, check in now, automatic check-ins while TripWise is open`.

### Task 11: Docs and wrap-up
**Files:** `README.md` (features + roadmap), `backend/README.md` (endpoints), spec (status "Part 3a built"; Names: English words for Dhara, Sangam, Kushal, Potli).
- [ ] **Step 1:** Update docs; both full suites, tsc, eslint — all green.
- [ ] **Step 2:** Final whole-branch review; fix Critical/Important with tests.
- [ ] **Step 3: Commit** `docs: Toli part 3a — together on the trip`; ask the owner before pushing.

### Not in Part 3a (on purpose)
Part 3b: the Toli album (photos), voice notes in Chaupal and the offline trip. Later still: push reminders
and background location/check-ins (the Android app), maps drawn in the page (would need a map library and
tile service).
