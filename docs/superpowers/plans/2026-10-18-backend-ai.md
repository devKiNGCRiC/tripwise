# Backend Step 1 (Real API + AI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A real Express + MongoDB backend that serves the exact API the frontend mock serves, writes itineraries with a free AI fallback chain (streamed, cached, validated), and is ready for free/premium plans.

**Architecture:**
- `createApp(deps)` builds the Express app.
- The AI chain is injected as a dependency, so tests use fake providers and never call the network.
- Routes are thin. The logic lives in `services/` (tokens, sessions, quota, cache, ai/*).
- The frontend gains a streaming client and a dev proxy. Mock mode keeps working and also streams.

**Tech Stack:**
- Node 24, TypeScript, Express 5, Mongoose 8, Zod 4 (`z.toJSONSchema`)
- `@google/genai` (`generateContentStream`, `config.responseMimeType` / `responseJsonSchema` / `abortSignal`) and `groq-sdk`
- `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `helmet`, `cors`, `express-rate-limit`
- Vitest, Supertest, mongodb-memory-server
- `tsx` (dev)

**Spec:** `docs/superpowers/specs/2026-10-18-backend-ai-design.md`

## Global Constraints

- **Comments:** every file has a header comment, and there's a comment before every module, function and block (the owner is learning). Match the frontend's comment style.
- **Attribution:** never add Claude as author, co-author or contributor. Commit messages have **no** `Co-Authored-By` or "Generated with" lines.
- **Commits:** go to `main` (the owner's preference). Never push without asking.
- **Secrets:**
  - Secrets live only in `backend/.env` (git-ignored). `backend/.env.example` lists the names with empty values.
  - Tests never read real keys, call Gemini or Groq, or touch Atlas.
- **API shape:**
  - The API is mounted under `/api`.
  - Error bodies are always `{ error: { code, message } }`, with the codes VALIDATION 400/409, UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, QUOTA_EXCEEDED 429, AI_UNAVAILABLE 503, SERVER 500.
- **Response shapes** equal `frontend/src/lib/api/types.ts`, plus these additive fields: `Itinerary.source?: 'ai'|'cache'` and `User.plan?: 'free'|'premium'`.
- **Plan limits:**

  | | plans/day | regenerations/day | max days |
  |---|---|---|---|
  | free | 5 | 15 | 14 |
  | premium | 50 | 150 | 14 |

  Days reset at midnight Asia/Kolkata.
- **AI order:** `gemini-flash-latest`, then `gemini-flash-lite-latest`, then Groq `openai/gpt-oss-120b`, then `qwen/qwen3.8-27b`. Names come from env (`GEMINI_MODELS`, `GROQ_MODELS`, comma lists). The timeout is 25 s per attempt.
- **Activities per day by pace:** chill 2, balanced 3, packed 4, with ±1 allowed.
- **Tokens:**
  - Access JWT: HS256, 15 min.
  - Refresh token: random 32 bytes, stored as a SHA-256 hash.
  - Refresh cookie: `tw_refresh`, httpOnly, `SameSite=Lax`, `Secure` in production, path `/api/auth`, 30 days. It rotates on refresh.
- **Rate limits:**
  - Auth: 10 per 15 min per IP.
  - Generate: 10 per min per user.
  - Global: 300 per 15 min per IP.
  - JSON body limit: 50 kb. `trust proxy` = 1.

## Review Focus

1. **Two tabs refresh together** with the same cookie. Without care, the second request looks like token reuse and logs the user out. Expected: a token rotated less than 30 s ago gets a fresh token in the same family. Older reuse revokes the family. (Task 3 test.)
2. **Two generate requests at once** when one plan is left. Expected: exactly one succeeds and the other gets QUOTA_EXCEEDED. (Task 5 test.)
3. **A long trip (14 days, packed) is cut off** at the model's output limit. Expected: the truncated JSON counts as an invalid attempt and the next model is tried. `maxOutputTokens` is set high enough (16384). (Task 6 test.)
4. **The user closes the tab mid-stream.** Expected: the provider call is aborted, and the reserved quota is refunded unless a trip was saved. (Task 9 test.)
5. **Trip start "today" at 00:30 India time** (which is still "yesterday" in UTC). Expected: accepted. "Past" is judged by the IST day. (Task 7 test.)

---

### Task 1: TypeScript scaffold, env, app shell

**Files:**
- Delete: `backend/server.js`, `backend/config/db.js`, the empty `controllers/ middleware/ models/ routes/ utils/` folders.
- Create:
  - `backend/package.json` (rewrite)
  - `backend/tsconfig.json`
  - `backend/vitest.config.ts`
  - `backend/.env.example`
  - `backend/src/config/env.ts`
  - `backend/src/lib/errors.ts`
  - `backend/src/app.ts`
  - `backend/src/server.ts`
  - `backend/src/routes/health.ts`
- Modify: root `.gitignore` (add `backend/dist`).
- Test: `backend/test/app.test.ts`, `backend/test/env.test.ts`

**Interfaces:**
- Produces:
  - `loadEnv(source?: NodeJS.ProcessEnv): Env`. `Env` has `NODE_ENV`, `PORT` (default 4000), `MONGO_URI`, `JWT_SECRET` (≥32 chars), `CLIENT_ORIGIN` (default `http://localhost:5173`), `GEMINI_API_KEY?`, `GROQ_API_KEY?`, `GEMINI_MODELS: string[]`, `GROQ_MODELS: string[]`.
  - `class AppError extends Error { status: number; code: ApiErrorCode }` with helpers `notFound(msg)`, `badRequest(msg)`, `unauthorized(msg)`, `forbidden(msg)`, `quotaExceeded(msg)`, `aiUnavailable(msg)`.
  - `type ApiErrorCode`: the same union as the frontend, minus `NETWORK`.
  - `createApp(deps: AppDeps): express.Express` with `interface AppDeps { ai: AiChain; now?: () => Date }`. Until Task 6, `AiChain` is a placeholder `unknown`.
  - It mounts helmet, CORS (origin = `CLIENT_ORIGIN`, credentials), `express.json({limit:'50kb'})`, cookie-parser, global rate limit, and `/api/health`.
  - A 404 handler and an error handler map `AppError` to its status and code. Zod errors become 400 VALIDATION with the first issue's message. Anything else becomes 500 SERVER "Something went wrong on our side." and is logged.
- Scripts: `dev` (tsx watch src/server.ts), `build` (tsc), `start` (node dist/server.js), `test` (vitest run), `seed`, `smoke:ai`.

- [ ] **Step 1: Write failing tests**
  - `GET /api/health` → 200 `{ ok: true }`.
  - `GET /api/nope` → 404, body `{ error: { code: 'NOT_FOUND' } }`.
  - A route that throws a plain `Error` → 500 with code `SERVER` and a message that doesn't contain the thrown text.
  - `loadEnv({})` throws, naming `MONGO_URI`.
  - `loadEnv({...valid, GEMINI_MODELS: 'a, b'}).GEMINI_MODELS` equals `['a','b']`.
- [ ] **Step 2: Run them.** `cd backend && npx vitest run`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement.** Install the deps. `server.ts` loads dotenv, connects Mongoose, then listens, and logs "TripWise API on :PORT". Real providers are wired in Task 6; until then pass a stub.
- [ ] **Step 4: Run again.** Expected: PASS. Also run `npx tsc --noEmit` and expect no errors.
- [ ] **Step 5: Commit.** `chore(backend): TypeScript Express scaffold with env checks, health and error handling`

### Task 2: Models and test database

**Files:**
- Create:
  - `backend/src/db/models/{user,session,destination,itinerary,usage,planCache}.ts`
  - `backend/src/db/toPublic.ts`
  - `backend/test/helpers/db.ts`
- Test: `backend/test/models.test.ts`

**Interfaces:**
- Produces the Mongoose models `User`, `Session`, `Destination`, `Itinerary`, `Usage` and `PlanCache`. Fields are as in spec §Data, plus:
  - `Itinerary.ownerId: ObjectId`, `Itinerary.cacheVariantId?: string`, `Itinerary.source`, `Itinerary.provider`.
  - `User.plan` default `'free'`, `User.role` default `'user'`, `User.blocked` default `false`.
- Indexes:
  - `User.email` unique.
  - `Itinerary` `{ownerId:1, createdAt:-1}`; `shareId` unique sparse.
  - `Usage` `{userId:1, day:1}` unique.
  - `PlanCache.key` unique; `createdAt` TTL 30 d.
  - `Session.tokenHash` unique; `expiresAt` TTL 0.
- `publicUser(doc): User` and `publicItinerary(doc): Itinerary`. Both turn `_id` into an `id` string and drop `ownerId`, `cacheVariantId`, `passwordHash` and `__v`.
- Test helpers: `startTestDb(): Promise<void>`, `clearTestDb()`, `stopTestDb()`. They use mongodb-memory-server and are used by every later integration test via `beforeAll` / `afterEach` / `afterAll`.

- [ ] **Step 1: Failing tests.**
  - Creating two users with `A@x.com` and `a@x.com` rejects the second (the email is lower-cased and unique).
  - `publicItinerary` output has `id` and no `ownerId`.
  - `publicUser` output has no `passwordHash`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the models and helpers.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): Mongo models and in-memory test database`

### Task 3: Auth (tokens, sessions, routes)

**Files:**
- Create:
  - `backend/src/services/tokens.ts`
  - `backend/src/services/sessions.ts`
  - `backend/src/middleware/auth.ts`
  - `backend/src/middleware/rateLimit.ts`
  - `backend/src/routes/auth.ts`
- Test: `backend/test/auth.test.ts`, `backend/test/sessions.test.ts`

**Interfaces:**
- **Tokens:** `signAccess(user: {id: string; role: Role}, now?: Date): string`, `verifyAccess(token): {sub: string; role: Role}` (throws `unauthorized`), `newRefreshToken(): {token: string; hash: string}`, `hashToken(token): string`.
- **Sessions:**
  - `createSession(userId, now): Promise<string>` starts a new family.
  - `rotateSession(token, now): Promise<{userId: string; token: string}>`.
  - `revokeSession(token): Promise<void>`.
  - Reuse rule (Review Focus 1): a presented token whose session was rotated **less than 30 s ago** gets a new token in the same family. Older rotated or unknown tokens throw `unauthorized`, and older reuse also revokes every session in that family.
- **Middleware:** `requireAuth` sets `req.user = {id, role, plan}` from the Bearer token. It loads the user and returns 403 FORBIDDEN if they're blocked. `authLimiter` and `generateLimiter` (keyed by user id) live in `rateLimit.ts`.
- **Routes:** `POST /api/auth/signup | login | refresh | logout | google` and `GET /api/auth/me`. The messages match the mock exactly:
  - "Please give a name, an email and a password of at least 8 characters."
  - "An account with this email already exists. Try logging in." (409 VALIDATION)
  - "Wrong email or password." (401)
  - "This account has been blocked. Contact support if you think this is a mistake." (403)
  - "Session expired. Please log in again." (refresh 401)
  - Google: 400 VALIDATION "Google sign-in isn't available yet."

- [ ] **Step 1: Failing tests.**
  - signup → 200 with `user.email` lower-cased, `user.plan === 'free'`, a string `accessToken`, and a `Set-Cookie` containing `tw_refresh=`, `HttpOnly` and `Path=/api/auth`.
  - A duplicate signup gets 409. A wrong password gets 401. A blocked user's login gets 403.
  - `/auth/me` without a token gets 401; with the token it gets 200 `{user}`.
  - refresh with the cookie → 200 and a new cookie value. Reusing the old cookie 31 s later (with `now` injected) → 401, and the newer cookie is then also rejected (the family is revoked). Reusing it 5 s later → 200 (grace).
  - logout → 204, after which refresh gets 401.
  - The 11th login from the same IP within 15 min gets 429.
  - Blocking a user after login makes their next refresh get 403 FORBIDDEN.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Use bcryptjs with cost 12 (cost 4 when `NODE_ENV=test`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): email auth with short access tokens and rotating refresh cookie`

### Task 4: Destinations and seed

**Files:**
- Create:
  - `backend/src/data/destinations.json` (the 12 entries from `frontend/src/mocks/data/destinations.ts`, the same ids and fields, `photo()` expanded)
  - `backend/scripts/seed-destinations.ts` (upsert by slug)
  - `backend/src/routes/destinations.ts`
- Test: `backend/test/destinations.test.ts`

**Interfaces:**
- `GET /api/destinations` returns `{destinations}`. Filters:
  - `vibe`: an element of `vibes`.
  - `budget`: equals `budgetTier`.
  - `month`: an element of `bestMonths`; invalid values give 400.
  - `q`: case-insensitive match on name, country or localName, with regex characters escaped.
- `GET /api/destinations/:slug` returns `{destination}`, or 404 NOT_FOUND.
- `seedDestinations(): Promise<number>` is exported for tests.

- [ ] **Step 1: Failing tests.**
  - After seeding, the count is 12.
  - `?vibe=beach` returns only items that include beach.
  - `?q=GO` includes `goa`.
  - `?q=(` → 200 (no regex crash).
  - `?month=13` → 400.
  - `/destinations/nowhere` → 404.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): destinations API and seed script`

### Task 5: Plans, quota and `/me/quota`

**Files:**
- Create: `backend/src/config/plans.ts`, `backend/src/services/quota.ts`, `backend/src/routes/me.ts`
- Test: `backend/test/quota.test.ts`

**Interfaces:**
- `PLANS: Record<'free'|'premium', {plansPerDay; regensPerDay; maxDays}>`. The values are in Global Constraints.
- `istDay(now: Date): string` returns `YYYY-MM-DD` in Asia/Kolkata.
- `nextIstMidnight(now): Date`.
- `getQuota(userId, plan, now): Promise<Quota>` uses plans only.
- `reserve(userId, plan, kind: 'plans'|'regens', now): Promise<boolean>`. It's atomic and works like this:

  ```
  updateOne({userId, day, [kind]: {$lt: limit}}, {$inc: {[kind]: 1}}, {upsert: true})
  ```

  If the record is already at the limit, the upsert hits a duplicate key (E11000). Catch that and return `false`.
- `refund(userId, kind, now): Promise<void>` decrements, but never below 0.
- `GET /api/me/quota` returns `{quota}`.

- [ ] **Step 1: Failing tests.**
  - `istDay(new Date('2026-10-18T19:00:00Z'))` equals `'2026-10-19'` (00:30 IST).
  - `nextIstMidnight` of that date equals `2026-10-19T18:30:00.000Z`.
  - 5 sequential `reserve(...,'plans')` calls return true and the 6th returns false.
  - **Review Focus 2:** with 4 already used, `Promise.all` of 2 reserves gives exactly one `true`.
  - `refund` brings `used` back down.
  - `/me/quota` gives `{used:0, limit:5}` for a free user and `limit:50` when the user's plan is premium.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): per-plan daily quota on India time`

### Task 6: AI core: schema, prompt, validation, fallback chain, providers

**Files:**
- Create: `backend/src/services/ai/{schema,prompt,validate,chain,gemini,groq,index}.ts`
- Test: `backend/test/ai/{validate,prompt,chain}.test.ts`, `backend/test/helpers/fakeAi.ts`

**Interfaces:**
- **schema.ts:**
  - `aiActivitySchema` covers `{time, startTime: /^\d\d:\d\d$/, title, description, location?, estCost ≥0, transfer?: {mode: TransferMode; minutes ≥0}}`.
  - `aiDaySchema` is `{theme, activities[]}`.
  - `aiTripSchema` is `{title, summary, days: AiDay[], breakdown: {stay, food, transport, activities}, tips: string[], packingList: string[]}`.
  - It also exports the types `AiTrip` and `AiDay`, plus `tripJsonSchema` and `dayJsonSchema` (from `z.toJSONSchema`).
- **prompt.ts:**
  - `interface Prompt { system: string; user: string; jsonSchema: object }`.
  - `tripPrompt(req: TripRequest): Prompt`.
  - `dayPrompt(req, otherDays: AiDay[], dayNumber): Prompt`. `otherDays` lists the places already used, so they're avoided.
  - The destination is quoted as data inside `<destination>` tags and capped at 80 characters.
- **validate.ts:**
  - `class InvalidAiOutput extends Error`.
  - `parseTrip(text: string, req): AiTrip` runs JSON.parse, then the zod check, then `checkDays`.
  - `parseDay(text, pace): AiDay`.
  - `checkDays(days, req)` checks:
    - the count equals the inclusive date range
    - activity counts within the pace range
    - strictly rising `startTime`s
    - no `transfer` on the last activity

  Each failure throws `InvalidAiOutput` with a reason.
- **chain.ts:**
  - `interface AiProvider { name: 'gemini'|'groq'; model: string; stream(p: Prompt, signal: AbortSignal): AsyncIterable<string> }`.
  - `interface ChainHooks { onText?(chunk: string): void; onReset?(): void; signal?: AbortSignal }`.
  - `interface AiChain { run<T>(p: Prompt, parse: (text: string) => T, hooks?: ChainHooks): Promise<{value: T; provider: 'gemini'|'groq'; model: string}> }`.
  - `createAiChain(providers: AiProvider[], opts?: {timeoutMs?: number; log?: (e: AttemptLog) => void}): AiChain`.
  - It tries the providers in order, each with its own `AbortController` that is aborted on the timeout or `hooks.signal`. It collects the text, then calls `parse`.
  - When moving on from a provider that already sent text, it calls `onReset`.
  - If everything fails, it throws `aiUnavailable("Our AI planners are busy right now. Please try again in a minute.")`.
  - If `hooks.signal` is aborted, it stops immediately and doesn't try further providers.
  - It logs `{provider, model, ms, outcome: 'ok'|'invalid'|'timeout'|'error'}` only.
- **gemini.ts:** `geminiProvider(apiKey, model): AiProvider`. It calls `ai.models.generateContentStream` with `config: {systemInstruction, responseMimeType:'application/json', responseJsonSchema, maxOutputTokens:16384, abortSignal}` and yields `chunk.text`.
- **groq.ts:** `groqProvider(apiKey, model): AiProvider`. It calls `chat.completions.create({stream:true, response_format:{type:'json_object'}, max_completion_tokens:16384, messages:[system (includes the JSON schema text), user]}, {signal})` and yields `delta.content`.
- **index.ts:** `buildChain(env): AiChain` creates a provider for each model, skipping a vendor whose key is missing. It's wired into `server.ts`.
- **fakeAi.ts:** `fakeProvider(name, script: Array<'timeout' | 'error' | {text: string; chunks?: number}>)` and `aiTripFixture(req): AiTrip`, a valid trip for any request.

- [ ] **Step 1: Failing tests.**
  - **validate:**
    - The fixture passes.
    - A wrong day count, 6 activities on chill, falling times or a transfer on the last stop each throw `InvalidAiOutput`.
    - Text cut off halfway → `InvalidAiOutput` (**Review Focus 3**).
  - **prompt:** `tripPrompt` user text contains the dates, the pace's activity count and the per-person budget. A destination of 200 characters is cut to 80 characters.
  - **chain:**
    - First provider times out (timeoutMs 50), second returns the fixture → resolves with provider 2. Its attempt log shows `timeout` then `ok`.
    - First returns invalid JSON → `onReset` is called once and the second is used.
    - All fail → throws AppError 503 `AI_UNAVAILABLE`.
    - An aborted `hooks.signal` → rejects, and the second provider is never called.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The prompt wording is the builder's choice, within the spec's rules.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): AI fallback chain with Gemini and Groq, strict output validation`

### Task 7: Itineraries API (generate, CRUD, regenerate day, share)

**Files:**
- Create:
  - `backend/src/services/tripRequest.ts`
  - `backend/src/services/buildItinerary.ts`
  - `backend/src/routes/itineraries.ts`
  - `backend/src/routes/share.ts`
- Test: `backend/test/itineraries.test.ts`

**Interfaces:**
- `tripRequestSchema` (Zod) checks:
  - destination: trimmed, 1–80 characters
  - startDate / endDate: ISO dates, `end ≥ start`, `start ≥ istDay(now)`, at most `maxDays` days
  - budget: amount an integer ≥500, currency `'INR'`
  - travellers and pace: enums
  - interests: 1–5 unique

  Its messages match the frontend's `dateErrors` wording ("Start date can't be in the past.", "End date must be on or after the start date.", "Trips can be up to 14 days.").
- `buildItinerary(ai: AiTrip, req, meta: {ownerId; provider; source: 'ai'|'cache'; cacheVariantId?}): ItineraryDoc`. It sets day `dayNumber` and `date` from `tripDates(start, end)`, and `estimatedCost = {total: sum(breakdown), breakdown, currency:'INR'}`.
- **`POST /api/itineraries/generate`** (requireAuth, generateLimiter):
  1. Validate the request.
  2. `reserve('plans')`, or 429 "You've used all 5 AI plans for today." (using the plan's limit).
  3. `deps.ai.run(tripPrompt, parseTrip)`.
  4. Save the trip and return `{itinerary, quota}`.
  5. On any failure, `refund` and rethrow.
- **`POST /api/itineraries/:id/days/:n/regenerate`:** owner only, else 404.
  1. `reserve('regens')`, or 429 "You've used today's fresh ideas — try again tomorrow."
  2. Run `dayPrompt` + `parseDay`, replace day n (keeping its date), recompute nothing else, save.
  3. Return `{itinerary}`. Refund on failure.
- **`GET /`** lists newest first. **`GET /:id`**, **`DELETE /:id`** (204), and **`POST /:id/share`** (idempotent, `shareId` = 12-character base64url) are owner-only, with 404 otherwise. An invalid ObjectId also gives 404.
- **`GET /api/share/:shareId`** is public. It returns `{itinerary}` or 404.

- [ ] **Step 1: Failing tests** (with a fake chain).
  - Generate → 200. `itinerary.days.length` equals the inclusive range, `day.date`s run in order, `estimatedCost.total` equals the breakdown sum, `source === 'ai'`, `provider === 'gemini'`, and `quota.used === 1`.
  - A 6th generate → 429 QUOTA_EXCEEDED.
  - A chain that always fails → 503, and `/me/quota` still shows `used` unchanged.
  - A past start → 400 with that message. A 15-day trip → 400.
  - **Review Focus 5:** with `now` = `2026-10-18T19:00:00Z`, start `2026-10-19` → 200.
  - User B reading, deleting, sharing or regenerating user A's trip → 404.
  - Regenerate day 2 → day 2 changes, and days 1 and 3 plus the dates stay the same.
  - Share twice → the same `shareId`. `/api/share/:id` works without auth.
  - Delete → 204, then get → 404.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `tripDates` is a copy of the frontend generator's helper.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): itineraries API — AI generate, saved trips, day regenerate, share links`

### Task 8: Plan cache

**Files:**
- Create: `backend/src/services/cache.ts`
- Modify: `backend/src/routes/itineraries.ts` (the generate path)
- Test: `backend/test/cache.test.ts`

**Interfaces:**
- `budgetBand(amountPerDay: number): 'budget'|'mid'|'luxury'` uses `<2500`, `<7000`, then anything above.
- `cacheKey(req): string` joins these values with `|`: lower-cased and space-collapsed destination, number of days, month of the start date, travellers, pace, sorted interests, budget band.
- `pickCached(key, userId): Promise<{trip: AiTrip; variantId: string} | null>`. It returns `null` while the pool has fewer than 3 variants. Otherwise it returns a random variant whose id isn't among the user's itineraries' `cacheVariantId`s, or `null` if the user has had all of them.
- `addToCache(key, trip, provider: 'gemini'|'groq'): Promise<string>` pushes `{id, trip, provider}` (keeping at most 3) and returns the variant id.
- **Generate flow:**
  1. `pickCached`. If it hits, save with `source:'cache'`, `provider` = the variant's original provider (stored in the variant), and **no reserve**.
  2. If it misses, run the AI path. On success, `addToCache` and save `cacheVariantId`.

- [ ] **Step 1: Failing tests.**
  - `cacheKey` is the same for `" Goa "` / `"goa"` and for interests in a different order.
  - The key differs across months and budget bands.
  - Three generations by different users fill the pool. A 4th user's generate gives `source:'cache'`, the fake chain isn't called, and `quota.used` is 0.
  - The same user generating 4 times never gets the same variant twice, and gets AI on the 4th once they've had all 3.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): share-safe plan cache so repeat trips are instant and free`

### Task 9: Streaming generate

**Files:**
- Create: `backend/src/services/ai/partialJson.ts`
- Modify: `backend/src/routes/itineraries.ts`
- Test: `backend/test/ai/partialJson.test.ts`, `backend/test/stream.test.ts`

**Interfaces:**
- `createTripStreamParser(): { push(chunk: string): {meta?: {title: string; summary: string}; days: AiDay[]} }`.
  - It returns only *newly* complete items on each push. `meta` is returned once, when both strings are complete.
  - **Algorithm:** keep the full text. Scan forward from the last position, tracking string, escape and bracket depth.
    - Inside the `"days"` array, at depth 2, every `{` … matching `}` is one day: `JSON.parse` that slice and check it with `aiDaySchema`.
    - Get `title` / `summary` by trying `JSON.parse` on their completed string values.
- **`POST /api/itineraries/generate/stream`:**
  - It does the same validation, cache and quota steps as generate.
  - It answers with `Content-Type: application/x-ndjson` and writes one JSON line per event: `{type:'meta',title,summary}`, `{type:'day', day: Day}` (with `dayNumber` and `date` filled in), `{type:'reset'}`, and finally `{type:'done', itinerary, quota}` or `{type:'error', error:{code,message}}`.
  - Errors before streaming starts (validation, quota) are normal JSON error responses with their status.
  - A cache hit streams `meta`, then each day, then `done`, without delays.
  - `req.on('close')` aborts the chain through `hooks.signal`. If nothing was saved, the reserved quota is refunded.

- [ ] **Step 1: Failing tests.**
  - **Parser:** feeding the fixture's JSON split into 7-character chunks yields `meta` once and every day once, in order. Strings containing `}` and `\"` don't break it.
  - **Route:** the response lines parse as `meta`, then `day` × N, then `done`. `done.itinerary` is saved (GET finds it).
  - A fake that fails after some text and then succeeds on the second provider gives a `reset` line between them.
  - **Review Focus 4:** aborting the request after the first chunk means the fake provider's signal is aborted, and `/me/quota` then shows `used` 0.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): stream itineraries day by day as the AI writes them`

### Task 10: Frontend: streaming client, live generating screen, dev proxy, contract fields

**Files:**
- Modify:
  - `frontend/src/lib/api/types.ts` (adds `source?`, `plan?` and `GenerateEvent`)
  - `frontend/src/lib/api/client.ts` (adds `stream`)
  - `frontend/src/lib/api/endpoints.ts` (adds `generateStream`)
  - `frontend/src/features/planner/hooks.ts`
  - `frontend/src/features/planner/GeneratingScreen.tsx`
  - `frontend/src/mocks/handlers/itineraries.ts` (stream handler + `source:'ai'`)
  - `frontend/src/mocks/db.ts` (`plan:'free'` on public users)
  - `frontend/vite.config.ts` (`server.proxy['/api'] = 'http://localhost:4000'`)
  - `frontend/.env.example`
- Test: `frontend/src/lib/api/client.test.ts` (extended), `frontend/src/features/planner/PlannerWizard.test.tsx` (still green)

**Interfaces:**
- `type GenerateEvent = {type:'meta'; title: string; summary: string} | {type:'day'; day: Day} | {type:'reset'} | {type:'done'; itinerary: Itinerary; quota: Quota} | {type:'error'; error: {code: ApiErrorCode; message: string}}`.
- `client.stream(path, options, onLine: (value: unknown) => void): Promise<void>`. It shares `send` and the refresh-on-401 logic with `request`, and a non-OK response throws exactly like `request`. It reads `res.body` with a `TextDecoder` and splits on `\n`, keeping any partial line until the next chunk.
- `itinerariesApi.generateStream(request, onEvent: (e: GenerateEvent) => void): Promise<GenerateResponse>`. It resolves on `done` and rejects with `ApiError(code, message)` on `error`.
- `useGenerateItinerary` keeps its mutation API and adds `preview: {title?: string; summary?: string; days: Day[]}`. A `reset` clears `days`.
- `GeneratingScreen` (an added prop `preview`): under the existing animation, the title appears once known, and each arrived day shows in a list as "Day N · theme", fading in with the existing `swap` class. The list is `aria-live="polite"` with the label "Days planned so far".
- The mock stream handler sends `meta`, then each day 400 ms apart, then `done`, built from `generateItinerary`. The existing JSON handler stays.

- [ ] **Step 1: Failing tests.**
  - `client.stream`: lines split across chunks (`'{"a":1}\n{"b"'` then `':2}\n'`) give `[{a:1},{b:2}]`.
  - A 401 → refresh → retry, then it streams.
  - `generateStream` rejects with `ApiError` code `AI_UNAVAILABLE` on an `error` event.
  - The PlannerWizard test (mock mode) shows "Days planned so far" containing "Day 1" before it navigates to the trip.
- [ ] **Step 2: Run.** `cd frontend && npx vitest run`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the whole frontend suite plus `npx tsc -b --noEmit`. Expected: all green (154 + new).
- [ ] **Step 5: Commit.** `feat(frontend): watch the itinerary arrive day by day; dev proxy to the real API`

### Task 11: Smoke script, docs, real end-to-end check

**Files:**
- Create: `backend/scripts/smoke-ai.ts`, `backend/README.md`
- Modify: root `README.md` (backend section and how to run both)

**Interfaces:**
- `npm run smoke:ai` uses the real keys from `.env`. For **each** model separately it runs a 2-day trip prompt through `parseTrip`, and prints `model · ok/invalid/error · ms` and nothing else.
- `backend/README.md` covers setup (`.env` names, `npm run seed`, `npm run dev`), the scripts, the plan limits table, and how the frontend switches modes.

- [ ] **Step 1: Run** `cd backend && npm run seed && npm run smoke:ai`. Expected: 12 destinations seeded, and at least the first Gemini model and one Groq model print `ok`. Record the results in the ledger.
- [ ] **Step 2: Run end to end.**
  1. Start the backend with `npm run dev` on :4000.
  2. Start the frontend with `VITE_USE_MOCKS=false`.
  3. In Edge (a playwright-core script in the scratchpad): sign up, plan a 3-day trip, watch the days stream, open the trip, regenerate a day, share it, open the share link logged out, and reload the page while logged in (the session survives through the refresh cookie).

  Expected: every step works, with no console errors. Take screenshots of the generating screen and the trip.
- [ ] **Step 3: Run** `cd backend && npx vitest run && npx tsc --noEmit` and `cd frontend && npx vitest run`. Expected: all green.
- [ ] **Step 4: Commit.** `docs: run the real backend and AI end to end`
