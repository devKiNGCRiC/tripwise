# TripWise Backend, Step 1: real API with AI itineraries

Status: draft for the owner's approval · 2026-10-18

## 1. Intent

TripWise is going to be a real product, not just a demo. Right now the frontend talks to a fake API that runs in the browser (MSW). This step builds the **real backend**. When it's done, switching one setting (`VITE_USE_MOCKS=false`) makes the same screens work with real accounts, real saved trips and itineraries written by real AI.

It also lays the groundwork for what comes later:
- step 2: our own planner and places database, with RAG
- step 3: the "Ask TripWise" agent
- then Crew mode, deploy, and Premium with Razorpay

### Goals
- **Same contract as the mock.** Every endpoint in `frontend/src/lib/api/types.ts` / `endpoints.ts` that the app uses today returns exactly the shapes, status codes and error codes the mock returns, so the UI can't tell the difference.
- **Real AI itineraries, always free to run.** Gemini comes first, with automatic fallback to other free models, and every answer is validated before it's saved.
- **Feels fast.** Generation streams day by day into the existing generating screen, and similar requests are served from a cache.
- **Ready for plans.** Each user has a plan (`free` / `premium`), and limits come from per-plan config, so Premium later is a config and payment change, not a rewrite.
- **Safe enough for real users.** Hashed passwords, httpOnly refresh cookie, rate limits, input validation, no secrets in git or logs.

### Non-goals (later steps)
- Our own planner, the places database and RAG (step 2).
- The "Ask TripWise" agent (step 3).
- Crew mode, admin endpoints, Google sign-in, payments and deployment.

### Anti-goals
- Anything that costs money to run at launch scale.
- An AI answer saved without validation (made-up structure, wrong number of days, broken times).
- Breaking the frontend's existing tests or mock mode. Mock mode stays fully working for UI work.

## 2. Constraints
- Free tiers only:
  - MongoDB Atlas M0 (512 MB)
  - Gemini API free tier (own `TripWise` project)
  - Groq free tier
  - Render free web service (512 MB RAM, sleeps after 15 min)
- Node 24 locally; Render runs a current LTS Node.
- Comments in every file: a header, plus a comment before every module, function and block (the owner is learning).
- Never add Claude as author, co-author or contributor anywhere.
- Secrets live only in `backend/.env` (git-ignored). A committed `backend/.env.example` lists the names.

## 3. Decided

### Stack
- TypeScript on Express 5. The existing skeleton (plain JS with only a DB connect) is replaced. TypeScript matches the frontend, and the shared contract is easier to keep correct.
- Mongoose 8 for MongoDB.
- Zod for validating requests and AI output.
- Vitest, Supertest and mongodb-memory-server for tests. Tests never call real AI or Atlas.
- Dev runs with `tsx watch`; production with `tsc` build then `node dist/server.js`.

### Endpoints (all under `/api`)

**Auth**
- `POST /auth/signup` and `POST /auth/login` return `{ user, accessToken }` and set the refresh cookie.
- `POST /auth/refresh` returns `{ accessToken }`. It rotates the refresh cookie.
- `POST /auth/logout` returns 204 and revokes the session.
- `GET /auth/me` returns `{ user }`.
- `POST /auth/google` exists but answers `400 VALIDATION` with "Google sign-in isn't available yet". The frontend already hides the Google button outside mock mode. Google sign-in is a later, opt-in step: it needs a free Google Cloud OAuth client.

**Destinations**
- `GET /destinations?vibe&budget&month&q`
- `GET /destinations/:slug`
- Both read from Mongo. A seed script loads the same 12 destinations the mock uses.

**Itineraries (login required)**
- `POST /itineraries/generate` returns `{ itinerary, quota }`.
- `POST /itineraries/generate/stream` is the same as generate, but streamed (see Streaming).
- `GET /itineraries`, `GET /itineraries/:id` and `DELETE /itineraries/:id`. Another user's trip answers 404 NOT_FOUND, never 403, so we don't reveal that it exists.
- `POST /itineraries/:id/days/:n/regenerate` returns `{ itinerary }`.
- `POST /itineraries/:id/share` returns `{ shareId }`. If the trip already has one, it returns the same id.

**Public**
- `GET /share/:shareId` returns `{ itinerary }`.
- `GET /health` returns `{ ok: true }`. Render's health check uses it, and the frontend can use it to "wake" the server.

**User**
- `GET /me/quota` returns `{ quota }`.

**Errors**
- Always `{ error: { code, message } }`, with the existing codes: VALIDATION 400/409, UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, QUOTA_EXCEEDED 429, AI_UNAVAILABLE 503, SERVER 500.
- Messages are friendly. Stack traces are never sent to the client.

### Contract additions (additive only)
- `Itinerary.source?: 'ai' | 'cache'`. Later steps add `'engine'` for our own planner.
- `Itinerary.provider` stays `'gemini' | 'groq'`, and means whichever model wrote the content.
- `User.plan?: 'free' | 'premium'`.
- The mock is updated to return the same fields.

### Auth
- **Passwords:** bcrypt (`bcryptjs`, no native build), cost 12. Minimum 8 characters, the same rule as the frontend. Emails are stored lower-case.
- **Access token:** a JWT (HS256, `JWT_SECRET`) that lives 15 minutes. It's sent as `Authorization: Bearer`, which is how the client already works.
- **Refresh token:**
  - A random 32-byte value in an httpOnly, Secure (in production), `SameSite=Lax` cookie on path `/api/auth`, valid for 30 days.
  - Only its SHA-256 hash is stored, in a `sessions` collection, so logout and "blocked user" can revoke it.
  - It rotates on every refresh.
  - If an old, already-rotated token is used again, that whole session is revoked. This catches token theft.
- **Same-site cookie:** the frontend (Cloudflare Pages) and backend (Render) are on different domains, and browsers increasingly block cross-site cookies. So in production the frontend calls `/api` **on its own domain**, and a tiny Cloudflare Pages Function forwards it to Render. That's free and is set up in the deploy step. Locally, Vite's dev-server proxy does the same: `/api` goes to `http://localhost:4000`. Either way the cookie is first-party and `SameSite=Lax` works.
- **Blocked users:** answered 403 FORBIDDEN on login and refresh (same as the mock).

### Plans and limits (config in one file)
| Limit | free | premium (not sold yet) |
|---|---|---|
| AI trip plans per day | 5 | 50 |
| "New idea" day regenerations per day | 15 | 150 |
| Max trip length | 14 days | 14 days |

- A day starts at **midnight India time** (Asia/Kolkata), and `resetsAt` says when.
- Only full plans show in `Quota`. Running out of regenerations answers QUOTA_EXCEEDED with its own message.
- **A cache hit doesn't use the daily allowance.**
- Counters are stored per user per day, using atomic increments. When two requests arrive together, a third generation can't slip through.

### AI generation
- **Order of models:**
  1. `gemini-flash-latest`
  2. `gemini-flash-lite-latest`
  3. Groq `openai/gpt-oss-120b`
  4. Groq `qwen/qwen3.8-27b`

  Model names come from env, so they can be changed without code. (We already checked: `gemini-2.5-flash` is closed to new users, which is why we use the `-latest` names.)
- **Request:** JSON output against a schema generated from the Zod schema of the AI's part of the trip:
  - title, summary
  - days: theme plus activities (time, startTime, title, description, location, estCost, transfer)
  - cost breakdown, tips, packingList

  **The server, not the AI, fills in:** ids, dates per day, `request`, `provider`, `source`, `createdAt`, and `estimatedCost.total`, which is the sum of the breakdown.
- **Prompt rules:**
  - India-aware: INR, autos, trains.
  - Number of activities by pace: chill 2, balanced 3, packed 4 (±1 allowed).
  - Ordered `HH:MM` start times. A transfer to the next stop, but not after the last stop of the day.
  - Costs that fit the per-person budget times the number of travellers.
  - Real, well-known places only.
  - Packing list and tips that suit the season for those dates.

  The traveller's free-text destination (max 80 characters) is put in as data. It is never treated as instructions.
- **Validation after parsing:**
  - The day count equals the date range.
  - Activity counts are within the pace range.
  - Times rise within each day.
  - Costs are not negative.
  - There's no transfer on the last stop.

  One attempt that fails validation or times out (25 s per model) moves to the next model. If all fail, the user gets 503 AI_UNAVAILABLE and **no quota is used**.
- **Day regeneration:** the same chain, asked for one day only. It's given the rest of the trip, so it doesn't repeat places already used on other days.
- **Logging:** provider, model, time taken and outcome (ok / invalid / timeout / quota) are logged for each attempt. Prompts, keys and personal data are never logged.

### Streaming
- `POST /itineraries/generate/stream` answers with `application/x-ndjson`: one JSON event per line.
  - `{type:'meta', title, summary}` arrives as soon as the model has produced them.
  - `{type:'day', day}` arrives as each day finishes.
  - It ends with exactly one `{type:'done', itinerary, quota}` or `{type:'error', error:{code,message}}`.
- The server parses the model's partial JSON as it arrives. It only sends a day once that day's object is complete. When the stream ends, the final result is validated, exactly as in the non-streaming path.
- If the model fails mid-stream, the server sends `{type:'reset'}` and continues with the next model. The UI then clears the days shown so far.
- **Frontend:**
  - `itinerariesApi.generateStream(request, onEvent)` reads the stream with `fetch`. It uses the same refresh-on-401 logic as the rest of the client.
  - The generating screen shows each day appear under the title as it arrives.
  - Mock mode gets an MSW handler that streams the demo generator's days with small delays, so the UI is identical in both modes.
  - The plain `generate` endpoint stays as the fallback.

### Cache
- **Key:** destination (normalised), number of days, month of travel, travellers, pace, sorted interests and budget band (budget-tier boundaries per person per day).
- **Storage:** `plan_cache` stores up to **3** different plans per key (the AI part only, without dates). A TTL index removes them after 30 days.
- **Lookup:**
  - While a key has fewer than 3 plans, generate with AI and add the result.
  - Once it has 3, serve a random one the user hasn't been given before, re-dated to the user's dates and marked `source:'cache'`.
  - If the user has been given all 3, generate fresh with AI.
- **Regeneration:** day regeneration never uses the cache.

### Data (Mongo collections)
- `users`: name, email (unique), passwordHash, role, plan, blocked, createdAt.
- `sessions`: userId, tokenHash, familyId, expiresAt (TTL), revokedAt.
- `destinations`: the `Destination` shape, with a unique slug.
- `itineraries`: the `Itinerary` shape plus `ownerId`, with `shareId` unique and sparse. A user's list is newest first.
- `usage`: userId + day (unique), plans and regenerations.
- `plan_cache`: key, variants[], createdAt (TTL).

### Security basics
- `helmet` for security headers.
- CORS limited to `CLIENT_ORIGIN`, with credentials.
- JSON body limit of 50 kb.
- Strict Zod validation on every input; unknown fields are dropped.
- Rate limits:
  - Auth: 10 attempts per 15 minutes per IP.
  - Generate: 10 per minute per user.
  - Overall: 300 per 15 minutes per IP.
- `trust proxy` is enabled for Render, so the real IP is used.

### Layout
```
backend/
  src/
    server.ts                    # starts HTTP after Mongo connects
    app.ts                       # builds the Express app (tests import this)
    config/env.ts                # reads + validates env (Zod)
    config/plans.ts              # per-plan limits
    db/models/*.ts               # Mongoose models
    middleware/{auth,errors,rateLimit,validate}.ts
    routes/{auth,destinations,itineraries,share,me,health}.ts
    services/ai/{schema,prompt,validate,partialJson,chain,gemini,groq}.ts
    services/{quota,cache,tokens}.ts
  scripts/seed-destinations.ts
  test/**.test.ts
  .env.example
```

### Frontend changes
- `vite.config.ts`: a dev proxy sends `/api` to `http://localhost:4000`.
- `.env.example` documents both modes. `VITE_USE_MOCKS=true` stays the default for UI work, and `false` talks to the real backend.
- Types gain the additive fields. The mock returns them too.
- Streaming client and generating screen, as described in Streaming.
- All 154 existing tests stay green, plus new tests for the stream reader.

### Testing
- **Unit tests:** prompt building, AI output validation, the partial-JSON day extractor, the fallback chain (with fake providers that time out, return bad JSON or hit quota), the cache key and pool choice, quota day boundaries in IST, and token rotation and reuse detection.
- **Integration tests:** every endpoint against an in-memory MongoDB, with AI providers faked. They cover the happy path, validation, 401 + refresh, another user's trip giving 404, quota exceeded, all-models-down giving 503 with no quota used, and the stream event order.
- **One manual smoke script** (`npm run smoke:ai`) makes a single real request to each model with the real keys. It isn't part of the test suite.

## 4. Left to the builder
- The exact prompt wording, as long as it meets the rules above.
- The budget-band boundaries.
- Small library choices: a partial-JSON parser or our own, and cookie / rate-limit helpers.
- How the generating screen animates arriving days, within the Seven Worlds style.

## 5. Calls made while writing this (the builder's, not the owner's)
- TypeScript instead of extending the JS skeleton.
- Regenerations get their own hidden allowance (the mock doesn't count them; real AI calls cost quota).
- Cache hits are free for the user, and the pool size is 3.
- Same-site `/api` through a Cloudflare Pages Function instead of cross-site cookies.
- Google sign-in deferred.
- Premium limits are placeholders until pricing is decided.
