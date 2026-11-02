# Ask TripWise · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A question box on every trip that answers from the trip, the catalogue, nearby places and the
forecast, with real-place chips and follow-ups — real API and demo mock agreeing.

**Architecture:** `services/ask/brief.ts` builds the trip brief (pure, given data); `services/ask/weather.ts`
fetches and summarises the MET Norway forecast (injectable `fetch`, 1-hour cache); `services/ask/prompt.ts`
+ `parseAnswer` make and check the AI call through the existing chain; `routes/ask.ts` serves it with a new
daily allowance kind `'asks'` and a per-person `TripChat`. Frontend: `features/ask/AskTripWise.tsx` on the
trip page and the Toli's Sahyatra tab.

**Tech Stack:** as before; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-02-ask-tripwise-design.md`.

## Global Constraints
- Comment everything; no AI credit; commit to `main`; push only on the owner's word.
- Same access as reading the trip: owner, or any member of the trip's Toli; everyone else 404.
- Allowance: `asksPerDay` free 20 / premium 200; reserve before the AI call, refund if it fails (503).
- Question 1–300 chars after trimming; answer ≤ 1,200 chars; ≤ 3 follow-ups (≤ 80 chars each); `placeIds` only from the brief.
- Weather: MET Norway Locationforecast 2.0 compact; User-Agent `TripWise/1.0 (+https://github.com/devKiNGCRiC/tripwise)`; never the user's email; credit line "Weather: MET Norway" shown with forecast answers.
- Conversation: per person per trip, last 30 messages kept; `DELETE` clears.

## Review Focus
1. A stranger asking about someone else's trip (or a removed Sahyatri) — 404, no allowance used. → Task 3.
2. The model returning place ids that weren't in the brief, or extra prose around JSON — ids dropped, invalid output → next model. → Task 1.
3. MET Norway down or slow — the answer still comes, the brief says no forecast. → Task 2, 3.
4. A question trying to override the rules ("ignore your instructions…") — stays inside the tags as data. → Task 1.
5. Allowance exhausted — 429 before any AI call; an AI outage refunds. → Task 3.

---

### Task 1: Trip brief, prompt and answer check
**Files:** Create `backend/src/services/ask/brief.ts`, `backend/src/services/ask/prompt.ts`; Test `backend/test/askBrief.test.ts`.
- `tripBrief(input: { request; days; destination?: { name; bestMonths; avgDailyCost; region }; places: { id; name; kind; lat; lon }[]; forecast: DayForecast[] | null }): { text: string; placeIds: string[] }` — lists days and stops; for each stop with a place, catalogue places within 5 km (closest 5, with km); km between consecutive placed stops; forecast lines or "No forecast yet".
- `askPrompt(brief: string, history: { role: 'user' | 'assistant'; text: string }[], question: string): Prompt` — system rules (answer only from the brief + general knowledge, say when unsure, ≤ 120 words, straight-line distances are labelled, never invent places), question wrapped in `<question>` tags, last 10 history messages.
- `parseAnswer(text: string, allowed: Set<string>): { answer: string; placeIds: string[]; followUps: string[] }` — JSON schema check; unknown ids dropped; throws `InvalidAiOutput` when answer is empty/too long.
- [ ] Tests: brief lists nearby places within 5 km only; distances to one decimal; "No forecast yet" without forecast; injection text stays inside the tags; `parseAnswer` drops unknown ids, caps follow-ups at 3, rejects empty answers. → FAIL → implement → PASS → commit `feat(backend): Ask TripWise — trip brief, prompt and answer check`.

### Task 2: Weather from MET Norway
**Files:** Create `backend/src/services/ask/weather.ts`; Test `backend/test/askWeather.test.ts`.
- `type DayForecast = { date: string; high: number; low: number; rainMm: number; summary: string }`.
- `createWeather(fetchFn = fetch, now = () => new Date()): { forecast(lat, lon, dates: string[]): Promise<DayForecast[] | null> }` — dates beyond 9 days or failures → null (never throws); one request per rounded position per hour (cache); sends the User-Agent above.
- [ ] Tests (fake fetch with a trimmed real response): daily high/low/rain from hourly series (IST days); dates too far → null without a request; a 500 or a throw → null; a second call within the hour doesn't fetch again; the request has the User-Agent and no email. → commit `feat(backend): weather forecast for trips (MET Norway, cached, never blocks an answer)`.

### Task 3: Ask routes and allowance
**Files:** Create `backend/src/db/models/tripChat.ts`, `backend/src/routes/ask.ts`; Modify `config/plans.ts` (`asksPerDay`), `services/quota.ts` (`'asks'`), `types/api.ts` (`Quota.asks?`), `routes/itineraries.ts` (export `findTrip`), `app.ts` (mount with `weather` dep), test helpers (`askChain`); Test `backend/test/ask.test.ts`.
- `POST /itineraries/:id/ask { question }` → `{ reply: AskMessage, quota: { used, limit, resetsAt } }`; `GET /itineraries/:id/ask` → `{ messages: AskMessage[], quota }`; `DELETE` → 204. `AskMessage { role, text, places?: { id, name, destination }[], followUps?: string[], weatherCredit?: boolean, at }`.
- [ ] Tests: owner asks → reply with place chips from the catalogue; a Toli Sahyatri can ask about the Sahyatra and sees only their own conversation; stranger → 404 and no allowance used; 21st question → 429; every model failing → 503 and the allowance refunded; history is sent (last 10) and kept to 30; weather down → still answers. → commit `feat(backend): Ask TripWise routes — per-person conversations, daily allowance`.

### Task 4: Website client and demo mock
**Files:** `frontend/src/lib/api/types.ts`, `endpoints.ts` (`askApi.history/ask/clear`), `mocks/handlers/ask.ts` (rule-based answers: nearby catalogue places for the trip's destination, distances, a "best time" line from the destination's best months), `mocks/db.ts`; Test `frontend/src/lib/api/ask.test.ts`.
- [ ] Tests: asking returns an answer with place chips from the catalogue; history persists; clear empties it; another user's trip → NOT_FOUND. → commit `feat(frontend): Ask TripWise client and demo mock`.

### Task 5: The question box
**Files:** Create `frontend/src/features/ask/AskTripWise.tsx`; Modify `pages/TripPage.tsx`, `features/toli/SahyatraTab.tsx`; Test `frontend/src/features/ask/Ask.test.tsx`.
- Suggested questions (chips) when empty; the conversation; place chips link to `/destinations/<slug>#place-<id>`; follow-up chips ask again; "x of 20 questions left today"; "Start over"; errors: allowance used, AI busy ("try again in a minute").
- [ ] Tests: tap a suggested question → answer with a place chip; follow-up chip asks it; 429 shows the allowance message; Start over clears. Browser screenshots at 1536 and 390. → commit `feat(frontend): Ask TripWise on every trip`.

### Task 6: Docs and wrap-up
README (feature row, roadmap step 4 ✓), backend README (endpoints), spec status "built"; both suites, tsc, eslint; final review; commit `docs: Ask TripWise`; ask before pushing.
