# Profile, Passport & Friends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give TripWise a full account (profile, photo, preferences, privacy, security), a three-part Passport
(cover · seven worlds & Yatra marks · visa-page journal), and friends with public passports. The real API, the
mock API and the UI all agree.

**Architecture:**
- **Backend:** new routes `profile`, `account`, `passport`, `journal`, `friends` and `users` sit on a few
  services: `username`, `passport` (pure computation), `photos` (storage adapter), `mailer` (log or Brevo) and
  `social` (friendship and visibility rules). Privacy is decided in one function, `canSeePassport`.
- **Frontend:** the passport becomes a feature folder of small components. Account and friends are new pages.
  The MSW mock mirrors every endpoint.

**Tech Stack:** as before (Express 5, Mongoose 8, Zod 4, Vitest/Supertest/mongodb-memory-server; React 19,
TanStack Query, RHF+Zod, MSW). There are no new paid services. Cloudinary and Brevo are used only when keys exist.

**Spec:** `docs/superpowers/specs/2026-10-19-profile-passport-friends-design.md`

## Global Constraints
- **Code style:** comment everything (file header + before every function and block). Never credit Claude
  anywhere, and commit messages have no Co-Authored-By or "Generated with" lines. Commit to `main` and don't push.
- **Contract:**
  - Real and mock APIs return identical shapes and error codes.
  - Errors are `{ error: { code, message } }`.
  - Unknown, private, blocked or someone else's resources answer **404**, never 403.
- **Users:**
  - **Username:** `^[a-z_][a-z0-9_]{2,19}$`, stored lower-case and unique. Reserved: `admin tripwise passport
    join api login signup u me help support`. It can be changed once per 24 h.
  - **Text limits:** bio ≤ 160, homeCity ≤ 80, memory ≤ 1000.
  - **Rating:** integer 1–5 or null.
  - **Traveller types:** `solo-explorer backpacker couple family-planner group-organiser luxury foodie
    culture-seeker adventure slow-traveller` (labels as in the spec).
  - **Privacy:** `passport: 'friends'|'everyone'|'private'` (default `friends`), `showJournal` (default `true`).
- **Images:**
  - **Avatar:** body ≤ 300 KB, type `image/webp|jpeg|png`, served by `GET /api/avatars/:userId`, and
    `avatarUrl` = `/api/avatars/<id>?v=<version>`.
  - **Journal:** ≤ 6 photos, each ≤ 1.5 MB after browser resize (long side ≤ 1600 px). Viewed only through
    `GET /api/photos/:photoId`.
- **Friends:** ≤ 20 pending sent requests, ≤ 30 requests per user per India-day. Invite code is 10 characters
  `[A-Za-z0-9]`.
- **Password reset:** token valid 30 min, single use, stored as SHA-256. Limits are 3 per email per hour and 10
  per IP per hour. `POST /auth/forgot` always answers 200. A new password revokes every session.
- **Completed trip:** `endDate < istDay(now)`.
- **Settings:** `APP_URL` (default `http://localhost:5173`), plus the optional `BREVO_API_KEY`, `MAIL_FROM` and
  `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET`. Without them, reset links are logged as
  `[mail] reset link for <email>: <url>` and photos are stored in MongoDB.

## Review Focus
1. **A blocked user**, or someone set to "Only me", opens a photo URL or `/u/:username` directly. Expected: 404,
   and nothing leaks (Task 6 and Task 7 tests).
2. **A deleted account.** Expected: its friendships, requests, journals, photos, avatar and sessions are gone,
   friends' lists drop it, and its old photo URLs answer 404 (Task 3 test).
3. **A username that differs only by case** from an existing one ("Asha" vs "asha"), or a reserved word.
   Expected: 409 "That username is taken" or 400 with a reason (Task 1 test).
4. **Writing a journal for an upcoming trip.** Expected: 400 "You can write about this trip once it's over"
   (Task 6 test).
5. **Uploading a non-image or oversized avatar or photo.** Expected: 400 "Please choose a JPG, PNG or WebP image
   under …", and nothing is stored (Task 2 and Task 6 tests).

---

### Task 1: Profile fields, usernames, GET/PATCH /me/profile

**Files:**
- Create:
  - `backend/src/services/username.ts`
  - `backend/src/routes/profile.ts`
- Modify:
  - `backend/src/db/models/user.ts` (the fields from spec §4: username, bio, travellerType, homeCity, avatar
    `{version}`, preferences, privacy, theme Mixed, inviteCode, usernameChangedAt)
  - `backend/src/db/toPublic.ts` (`publicUser` adds `username`, `avatarUrl?`, `plan`)
  - `backend/src/routes/auth.ts` (signup assigns a username and invite code)
  - `backend/src/app.ts`
- Test: `backend/test/profile.test.ts`

**Interfaces:**
- `normalizeUsername(raw: string): string` lower-cases and trims.
- `usernameProblem(name: string): string | null` returns the reason text or null.
- `makeUsername(name: string): Promise<string>`: a slug of the name (ASCII letters, digits, `_`; min 3, padded
  with `traveller`), and if it's taken, `slug + 2–4 random digits`, retried until free.
- `newInviteCode(): string`.
- **`GET /api/me/profile`** returns
  `{ profile: { ...publicUser, bio, travellerType, homeCity, preferences, privacy, theme, inviteCode } }`.
- **`PATCH /api/me/profile`** accepts any subset of name, username, bio, travellerType, homeCity, preferences,
  privacy and theme (Zod, unknown keys dropped) and returns `{ profile }`.
  - **Errors:** taken → 409 "That username is taken". Changed less than 24 h ago → 400 "You can change your
    username once a day". Reserved or badly formed → 400 with the reason.
- `PublicUser` (backend and frontend) gains `username: string` and `avatarUrl?: string`.

- [ ] **Step 1: Failing tests.**
  - Signup for the name "Asha Rao" gives `user.username` matching `/^asharao(\d{2,4})?$/`.
  - Two signups named "Asha Rao" get different usernames.
  - PATCH bio/type/homeCity/preferences/privacy round-trips through GET.
  - **Review Focus 3:** PATCH username `"Meera_K"` → stored `meera_k`. A second user PATCHing `"MEERA_K"` → 409.
    `"admin"` → 400. `"9lives"` → 400.
  - Two username changes within 24 h → the second gets 400.
  - A bio of 161 characters → 400.
- [ ] **Step 2: Run.** `cd backend && npx vitest run test/profile.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Existing users without a username or invite code get them lazily through
  `ensureUsername(user)`, called where `requireAuth` loads the user.
- [ ] **Step 4: Run.** The full backend suite plus `npx tsc --noEmit`. Expected: green.
- [ ] **Step 5: Commit.** `feat(backend): profiles with usernames, bio, traveller type, preferences and privacy`

### Task 2: Avatars

**Files:**
- Create:
  - `backend/src/db/models/avatar.ts` (`{ userId unique, data Buffer, contentType, updatedAt }`)
  - `backend/src/routes/avatars.ts`
- Modify: `backend/src/app.ts` (`express.raw` for image types, limit 300 kb, only on this route)
- Test: `backend/test/avatars.test.ts`

**Interfaces:**
- **`PUT /api/me/avatar`** takes a raw image body and returns `{ profile }` (the avatar version bumps).
- **`DELETE /api/me/avatar`** returns `{ profile }` with no `avatarUrl`.
- **`GET /api/avatars/:userId`** returns the bytes with `Cache-Control: public, max-age=31536000, immutable`, or 404.

- [ ] **Step 1: Failing tests.**
  - Uploading a tiny PNG makes `profile.avatarUrl` match `/^\/api\/avatars\/[a-f0-9]{24}\?v=\d+$/`, and GET
    returns the same bytes with `image/png`.
  - **Review Focus 5:** `text/plain` → 400 "Please choose a JPG, PNG or WebP image under 300 KB". A 301 KB body
    → 400 (same message). Nothing is stored either time.
  - After DELETE, GET answers 404.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Check the image's magic bytes (PNG/JPEG/WebP), not just the header.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): profile photos stored small in MongoDB`

### Task 3: Account security: change password, sign out everywhere, delete account, forgot/reset

**Files:**
- Create:
  - `backend/src/services/mailer.ts`
  - `backend/src/db/models/passwordReset.ts`
  - `backend/src/routes/account.ts`
- Modify:
  - `backend/src/config/env.ts` (`APP_URL`, `BREVO_API_KEY?`, `MAIL_FROM?`, `CLOUDINARY_*?`)
  - `backend/.env.example`
  - `backend/src/services/sessions.ts` (`revokeAllSessions(userId, now, exceptToken?)`)
- Test: `backend/test/account.test.ts`

**Interfaces:**
- `sendMail(msg: {to, subject, text, html}): Promise<void>`. It posts to Brevo's
  `https://api.brevo.com/v3/smtp/email` when `BREVO_API_KEY` is set, and otherwise logs the line given in Global
  Constraints. It's injectable as `deps.mailer` in `AppDeps` (default real) so tests can capture mail.
- **`POST /api/me/password`** `{ currentPassword, newPassword }` → 204. It revokes the other sessions and keeps
  the current cookie's family.
- **`POST /api/auth/logout-all`** → 204. Every session is revoked and the cookie cleared.
- **`DELETE /api/me`** `{ password }` → 204. It deletes the user, itineraries, journals plus their photos (via
  the Task 6 storage, which Task 3 calls through `deletePhotosOf(userId)` added in Task 6; until then a no-op
  stub in `services/photos.ts`), the avatar, sessions, usage, friendships, blocks and password resets.
- **`POST /api/auth/forgot`** `{ email }` → 200 `{ ok: true }` always. If the account exists and is under the
  limits, it emails `${APP_URL}/reset-password/<token>`.
- **`POST /api/auth/reset`** `{ token, password }` → 200 `{ ok: true }`. A bad, used or expired token → 400 "This
  reset link has expired. Ask for a new one."

- [ ] **Step 1: Failing tests.**
  - A wrong current password → 400 "Your current password isn't right".
  - After a password change, the old cookie on another login no longer refreshes, but this login's does.
  - logout-all → no cookie refreshes.
  - forgot for an unknown email → 200 and no mail.
  - forgot for a known email → one captured mail containing `/reset-password/`. Reset with that token → login
    works with the new password, the same token a second time → 400, and 31 minutes later → 400.
  - A 4th forgot within an hour → still 200, but no 4th mail.
  - **Review Focus 2:** DELETE /me with the wrong password → 400. With the right one → 204. Then login → 401,
    the friend's `/friends` no longer lists them, and `GET /photos/<their photo>` → 404. (Write this part
    against Task 6/7 helpers. If they aren't built yet, mark it `it.todo` and switch it to `it` in Task 7.
    Record that as a ruling.)
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full suite. Expected: green.
- [ ] **Step 5: Commit.** `feat(backend): change password, sign out everywhere, forgot password and delete account`

### Task 4: Every trip knows its world

**Files:**
- Modify:
  - `backend/src/services/ai/schema.ts` (`region: z.enum([...7, 'abroad', 'none'])`)
  - `backend/src/services/ai/prompt.ts` (a rule naming the seven worlds with example places)
  - `backend/src/db/models/itinerary.ts` (`region` string|null)
  - `backend/src/services/buildItinerary.ts`
- Create: `backend/src/services/region.ts`
- Test: extend `backend/test/itineraries.test.ts`, `backend/test/ai/validate.test.ts`

**Interfaces:**
- `regionFor(destination: string, aiRegion: string | undefined): Region | 'abroad' | null`. The catalogue
  destination's region wins (matched by case-insensitive name). If the catalogue country isn't India, it's
  `abroad`. Otherwise the AI value, with `'none'` becoming null.
- `Itinerary.region` is added to both type copies (backend `types/api.ts`, frontend `types.ts`). The mock
  generator sets the region from the destination record.

- [ ] **Step 1: Failing tests.**
  - The fixture with `region: 'thar'` for destination "Udaipur" gives a saved `itinerary.region === 'thar'`.
  - "Goa" with the AI saying `himalaya` → `konkan` (the catalogue wins).
  - "Paris" → `abroad`.
  - A missing region in AI JSON → `InvalidAiOutput`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Also update `aiTripFixture` to include `region: 'none'` by default.
- [ ] **Step 4: Run.** Expected: green.
- [ ] **Step 5: Commit.** `feat(backend): trips remember which of the seven worlds they belong to`

### Task 5: Passport computation and GET /me/passport

**Files:**
- Create:
  - `backend/src/services/passport.ts` (pure: no database)
  - `backend/src/services/marks.ts`
  - `backend/src/routes/passport.ts`
- Test: `backend/test/passport.service.test.ts`, `backend/test/passport.route.test.ts`

**Interfaces:**
- `MARKS: { id, emoji, name, how }[]`: the 12 marks of spec §3 with ids `first-steps wanderer mountain-goat
  desert-wind coast-calling monsoon-chaser family-yatri long-road storyteller beyond-india three-worlds
  all-seven`.
- `buildPassport(input: { user: PublicUserLike; trips: TripLike[]; journals: JournalLike[]; destinations:
  DestinationLike[]; today: string; includeUpcoming: boolean; includeJournal: boolean }): Passport`, where
  `Passport = { cover, stats, worlds, abroadCount, nextWorld, marks, stamps }`.
  - `cover = { name, username, avatarUrl?, bio, travellerType, homeCity, joined, theme }`
  - `stats = { trips, worlds, daysAway, marks }`
  - `worlds = { key, name, visited }[7]`, in REGIONS order. Backend copy of the keys and names:
    himalaya Himalaya, thar Thar, ganga Gangetic Plains, deccan Deccan Plateau, ghats Western Ghats, konkan
    Konkan & Malabar, sisters Seven Sisters.
  - `nextWorld = { key, name, bestMonths, line } | null`. Best months per world come from a backend constant
    copied from the frontend `regions.ts`.
  - `marks = { id, emoji, name, how, earnedAt: string | null }[]`
  - `stamps = { id, destination, localName?, region, startDate, endDate, status: 'completed' | 'upcoming',
    daysUntil?, journal?: { rating, hasMemory, photoCount, coverPhotoUrl? } }[]`, newest first.
- **`GET /api/me/passport`** returns `{ passport }` (upcoming and journals included).

- [ ] **Step 1: Failing tests (service, pure).**
  - No trips → all 7 unvisited, `nextWorld` set, every mark has `earnedAt: null`, and stats are 0.
  - A completed Himalaya family trip of 7 days in July gives worlds `[himalaya]`, `daysAway` 7, and marks
    first-steps, mountain-goat, monsoon-chaser, family-yatri and long-road earned, with the trip's end date as
    `earnedAt`.
  - An upcoming trip makes a stamp with `status 'upcoming'` and `daysUntil`, but no world or marks. With
    `includeUpcoming: false` it's absent.
  - 3 journals with memories → storyteller.
  - An abroad beach catalogue trip (Bali) → coast-calling and beyond-india, `abroadCount` 1.
  - `includeJournal: false` → no `journal` on stamps.
- [ ] **Step 2: Failing route test.** It returns `{ passport }` for the signed-in user, and an upcoming stamp
  is present.
- [ ] **Step 3: Run.** Expected: FAIL.
- [ ] **Step 4: Implement.** Days away is the inclusive day count of each completed trip.
- [ ] **Step 5: Run.** Expected: PASS.
- [ ] **Step 6: Commit.** `feat(backend): passport with seven worlds, Yatra marks and stamps`

### Task 6: Journals and private photos

**Files:**
- Create:
  - `backend/src/db/models/journal.ts`
  - `backend/src/db/models/photo.ts` (Mongo fallback bytes: `{ _id, ownerId, itineraryId, data?, contentType,
    width, height, cloudinaryId? }`)
  - `backend/src/services/photos.ts`
  - `backend/src/routes/journal.ts`
- Test: `backend/test/journal.test.ts`

**Interfaces:**
- `PhotoStore`:
  - `put(input: { ownerId, itineraryId, bytes: Buffer, contentType, width, height }): Promise<{ id }>`
  - `stream(id): Promise<{ contentType, body: Buffer | ReadableStream } | null>`
  - `remove(id): Promise<void>`
  - `createPhotoStore(env)` picks Cloudinary when all three `CLOUDINARY_*` keys exist (signed upload API via
    `fetch`, delivered through its authenticated API), and otherwise MongoDB.
  - `deletePhotosOf(userId)` replaces the Task 3 stub.
- **`GET /api/itineraries/:id/journal`** → `{ journal }`. A missing journal gives an empty one
  (`rating: null, memory: '', photos: []`).
- **`PUT /api/itineraries/:id/journal`** `{ rating, memory }` → `{ journal }`. Owner only, completed trips only.
- **`POST /api/itineraries/:id/journal/photos`** takes the raw image body, `?width=&height=&alt=`, and returns
  `{ journal }`. More than 6 → 400 "A trip can have up to 6 photos".
- **`DELETE /api/itineraries/:id/journal/photos/:photoId`** → `{ journal }`.
- **`GET /api/photos/:photoId`** returns the bytes when the viewer `canSeeJournalOf(ownerId)` (Task 7; until
  then owner only), and 404 otherwise. It has `Cache-Control: private, max-age=300`.
- Photo URL format: `/api/photos/<id>`.

- [ ] **Step 1: Failing tests.**
  - Saving rating 5 and a memory round-trips.
  - **Review Focus 4:** an upcoming trip → 400 "You can write about this trip once it's over".
  - Rating 6 → 400. A memory of 1001 characters → 400.
  - A 7th photo → 400 "A trip can have up to 6 photos".
  - **Review Focus 5:** a non-image → 400 "Please choose a JPG, PNG or WebP image under 1.5 MB".
  - Another user's GET journal or photo → 404.
  - Deleting a photo makes `GET /photos/:id` answer 404.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** The Cloudinary branch is implemented but isn't exercised by tests (no keys). Keep
  it behind the same interface.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `feat(backend): trip journals with diya ratings, memories and private photos`

### Task 7: Friends, blocks, invites and public passports

**Files:**
- Create:
  - `backend/src/db/models/friendship.ts`
  - `backend/src/db/models/block.ts`
  - `backend/src/services/social.ts`
  - `backend/src/routes/friends.ts`
  - `backend/src/routes/users.ts`
- Test: `backend/test/friends.test.ts`, `backend/test/publicPassport.test.ts`

**Interfaces:**
- **Visibility rules (`social.ts`):**
  - `relation(viewerId | null, ownerId): Promise<'self' | 'friend' | 'pending-out' | 'pending-in' | 'none' |
    'blocked'>`, where blocked means either direction.
  - `canSeePassport(viewerId | null, owner): Promise<boolean>`: self → yes; blocked → no; `private` → no;
    `friends` → only friends; `everyone` → yes, even with no viewer.
  - `canSeeJournalOf(viewerId | null, owner)` = `canSeePassport && (self || owner.privacy.showJournal)`.
- **`GET /api/friends`** → `{ friends: Card[], incoming: Request[], sent: Request[] }`, where
  `Card = { id, name, username, avatarUrl?, travellerType, trips }` and `Request = { id, user: Card, createdAt }`.
- **`POST /api/friends/requests`** `{ username }`:
  - Creates a pending request, or accepts at once if they already asked me.
  - Answers 404 "No traveller with that username" for unknown, blocked or private users, and for myself.
  - Already friends → 409 "You're already friends".
  - Limits → 429 QUOTA_EXCEEDED "You've sent a lot of requests — try again tomorrow".
- **Answering requests:**
  - `POST /api/friends/requests/:id/accept` (recipient only) and `POST /api/friends/requests/:id/decline`
  - `DELETE /api/friends/requests/:id` (requester cancels)
  - `DELETE /api/friends/:userId` (remove a friend)
- **Blocks:** `POST /api/blocks` `{ userId }` removes any friendship or requests either way. `DELETE
  /api/blocks/:userId`.
- **Lookup and invites:**
  - `GET /api/users/:username/card` → `{ card, relation }`, or 404 (same rules as requests).
  - `GET /api/invites/:code` → `{ card }`, or 404.
  - `POST /api/invites/:code/accept` → `{ friend: Card }`. Your own code → 400 "That's your own invite link".
  - `POST /api/me/invite-code` → `{ inviteCode }`.
- **`GET /api/users/:username/passport`** (auth optional, no `requireAuth`; it reads the Bearer token if present)
  → `{ passport, relation }` built with `includeUpcoming: false` and
  `includeJournal: canSeeJournalOf`. Otherwise 404 "This passport is private".
- `GET /photos/:id` now uses `canSeeJournalOf`. The Task 3 delete-account test is completed here.

- [ ] **Step 1: Failing tests (friends).**
  - A requests B by username; B sees it in `incoming` and accepts; both list each other.
  - B requesting A while A→B is pending → accepted immediately.
  - Unknown username → 404. Yourself → 404. Duplicate → 409.
  - The 21st pending sent request → 429.
  - An invite link: C accepts A's code → friends. A regenerates, and the old code → 404.
  - Block: A blocks B → their friendship is gone, B's card lookup of A → 404, and B's request → 404.
- [ ] **Step 2: Failing tests (public passport and photos).**
  - Privacy `friends`: a friend → 200 without upcoming stamps. A stranger → 404 "This passport is private".
    Logged out → 404.
  - `everyone`: logged out → 200.
  - `private`: a friend → 404, and the card lookup → 404 (**Review Focus 1**).
  - `showJournal: false`: a friend gets stamps without `journal`, and `GET /photos/:id` → 404.
  - Blocked → passport and photo both 404.
  - Turn the Task 3 `it.todo` into a passing test.
- [ ] **Step 3: Run.** Expected: FAIL.
- [ ] **Step 4: Implement.** The friendship pair key is the two ids sorted and joined.
- [ ] **Step 5: Run** the full suite plus tsc. Expected: green.
- [ ] **Step 6: Commit.** `feat(backend): friends, blocks, invite links and privacy-aware public passports`

### Task 8: Frontend contract, endpoints and mock API

**Files:**
- Modify:
  - `frontend/src/lib/api/types.ts`: Profile, Passport, Stamp, Mark, World, Journal, JournalPhoto, Card,
    FriendRequest, Relation, TravellerType, Privacy, Preferences, ProfilePatch, `User.username`,
    `User.avatarUrl`, `Itinerary.region`
  - `frontend/src/lib/api/endpoints.ts`: `profileApi`, `accountApi`, `passportApi`, `journalApi`,
    `friendsApi`, `usersApi`
  - `frontend/src/lib/api/client.ts`: `request` accepts a `Blob` body (it sends the raw body with the blob's
    `Content-Type`)
  - `frontend/src/mocks/db.ts`, `frontend/src/mocks/data/users.ts` (the seeds in spec §5: the demo profile, `u_meera`
    public with `everyone` privacy, a friend `u_kabir`, a pending incoming request from `u_zoya`, a sent request
    to `u_dev`)
  - `frontend/src/mocks/handlers/*`
- Create:
  - `frontend/src/mocks/handlers/social.ts` (profile, account, passport, journal, friends and users handlers)
  - `frontend/src/mocks/data/passport.ts`: a frontend port of the `buildPassport` and `MARKS` logic, with the
    same rules and its own copy
- Test: `frontend/src/mocks/social.test.ts`

**Interfaces:**
- **Endpoint functions:**
  - `profileApi.get()`, `profileApi.update(patch)`, `profileApi.uploadAvatar(blob)`, `profileApi.removeAvatar()`
  - `accountApi.changePassword(current, next)`, `accountApi.logoutAll()`, `accountApi.deleteAccount(password)`,
    `accountApi.forgot(email)`, `accountApi.reset(token, password)`
  - `passportApi.mine()`, `passportApi.of(username)`
  - `journalApi.get(tripId)`, `journalApi.save(tripId, {rating, memory})`,
    `journalApi.addPhoto(tripId, blob, {width, height, alt})`, `journalApi.removePhoto(tripId, photoId)`
  - `friendsApi.list()`, `friendsApi.request(username)`, `friendsApi.accept(id)`, `friendsApi.decline(id)`,
    `friendsApi.cancel(id)`, `friendsApi.remove(userId)`, `friendsApi.block(userId)`,
    `friendsApi.unblock(userId)`, `friendsApi.newInviteCode()`
  - `usersApi.card(username)`, `usersApi.invite(code)`, `usersApi.acceptInvite(code)`
- **Mock specifics:**
  - The mock passport uses the same rules as the backend.
  - Mock photos are data URLs kept in memory and served at `/api/photos/:id`. Mock avatars likewise.
  - The mock forgot handler logs the reset link to the console.
  - The seeded demo user's trips: Goa completed with a journal (rating 5, a memory, 2 photos), Jaipur
    completed without a journal, and Kerala upcoming in about 12 days.

- [ ] **Step 1: Failing tests** (calling `*Api` through MSW like `generateStream.test.ts`):
  - `passportApi.mine()` for `u_demo` has 2 completed stamps and 1 upcoming, and the first-steps mark is
    earned.
  - `friendsApi.list()` has 1 friend, 1 incoming and 1 sent.
  - `passportApi.of('meera')` works logged out.
  - `passportApi.of('kabir')` while logged out → ApiError `NOT_FOUND`.
  - `profileApi.update({ username: 'demo' })` succeeds, and `'meera'` → 409.
  - `journalApi.save` on the upcoming Kerala trip → 400.
- [ ] **Step 2: Run** `cd frontend && npx vitest run src/mocks/social.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full frontend suite plus `npx tsc -b --noEmit`. Expected: green. Existing tests that
  read the seeded trips may need their counts updated. Ledger any such change.
- [ ] **Step 5: Commit.** `feat(frontend): API contract and mock for profiles, passports, journals and friends`

### Task 9: Account tab, forgot/reset password, planner defaults

**Files:**
- Create:
  - `frontend/src/pages/AccountPage.tsx` (route `passport/account`, protected)
  - `frontend/src/features/account/{ProfileForm,AvatarEditor,PreferencesForm,PrivacyForm,SecurityPanel,DeleteAccount}.tsx`
  - `frontend/src/features/account/hooks.ts`
  - `frontend/src/lib/images.ts`
  - `frontend/src/pages/ForgotPasswordPage.tsx` (route `forgot-password`, guest)
  - `frontend/src/pages/ResetPasswordPage.tsx` (route `reset-password/:token`, guest)
- Modify:
  - `frontend/src/router.tsx`
  - `frontend/src/features/auth/AuthProvider.tsx` (adds `updateUser(user: User)`)
  - `frontend/src/features/auth/LoginForm.tsx` (a "Forgot password?" link)
  - `frontend/src/features/planner/PlannerWizard.tsx` (defaults from `profile.preferences`; a URL destination
    wins)
  - `frontend/src/pages/PassportPage.tsx` (the motion and theme controls move to Account)
- Test:
  - `frontend/src/pages/AccountPage.test.tsx`
  - `frontend/src/pages/ResetPasswordPage.test.tsx`
  - extend `frontend/src/features/planner/PlannerWizard.test.tsx`

**Interfaces:**
- `resizeImage(file: File, opts: { maxSide: number; square?: boolean; quality: number }): Promise<{ blob:
  Blob; width: number; height: number }>`: canvas → WebP if supported, else JPEG.
- The avatar editor uses square crop with a zoom range input (Cropper-free: a canvas preview with
  drag-to-pan), output 256 px.
- The sections and their `aria-label`s match spec §3: "Profile", "Travel preferences", "Privacy",
  "Look & feel", "Security", "Danger zone".
- Delete needs the password typed, then an existing `ConfirmDialog`. On success it logs out and goes to `/`
  with the toast "Your account and data have been deleted".

- [ ] **Step 1: Failing tests.**
  - The Account page shows the demo profile. Saving bio and type shows the toast "Profile saved", and the
    passport cover then shows the new bio.
  - Changing username to `meera` shows "That username is taken".
  - Privacy set to "Only me" is saved.
  - Delete with a wrong password shows "That password isn't right". The right password → lands on `/`.
  - Forgot shows the neutral message.
  - Reset with the mock token → "Password updated — log in with your new password" plus a link to `/login`.
  - The planner opened with no URL destination has its budget pre-filled from preferences (demo prefs:
    budget 4000, pace chill).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the frontend suite plus tsc. Expected: green.
- [ ] **Step 5: Commit.** `feat(frontend): Account tab, forgot/reset password and planner defaults`

### Task 10: The new Passport page

**Files:**
- Create:
  - `frontend/src/features/passport/PassportCover.tsx`
  - `frontend/src/features/passport/WorldsPanel.tsx`
  - `frontend/src/features/passport/YatraMarks.tsx`
  - `frontend/src/features/passport/VisaPages.tsx` (stamps, paging, prompt)
  - `frontend/src/features/passport/JournalSheet.tsx` (diyas, memory, photos, theme button)
  - `frontend/src/features/passport/DiyaRating.tsx`
  - `frontend/src/features/passport/hooks.ts`
  - `frontend/src/features/passport/PassportView.tsx` (shared by mine and public)
  - `frontend/src/world/useAccountTheme.ts`
- Modify:
  - `frontend/src/pages/PassportPage.tsx` (rewritten)
  - `frontend/src/features/passport/StampGrid.tsx` (folded into VisaPages, then delete)
  - `frontend/src/pages/PassportPage.test.tsx` (rewritten)
- Test: `frontend/src/pages/PassportPage.test.tsx`, `frontend/src/features/passport/DiyaRating.test.tsx`

**Interfaces:**
- `PassportView({ passport, mine, onOpenStamp? })` renders sections with `aria-label`s "Passport cover",
  "Your seven worlds", "Yatra marks", "Visa pages".
- `DiyaRating({ value, onChange?, label })` is a radiogroup of 5 (keyboard arrows). Read-only when there's no
  `onChange`.
- `useAccountTheme()`: once signed in, applies `profile.theme` through `setTint`. The YourColours picker and
  the journal's theme button save to the profile while signed in. "Back to world colours" saves `null`.
- **Journal sheet:** a dialog labelled "{destination} journal". Photo add uses `resizeImage(maxSide 1600,
  quality .85)`, and photos show via their `/api/photos/:id` URLs.
- **Visa pages:** 9 stamps per page. ◀ ▶ buttons are labelled "Previous page" and "Next page". The prompt
  button reads "How was {destination}?".

- [ ] **Step 1: Failing tests.**
  - The demo passport shows the cover with `@`username, bio and the "Foodie" chip.
  - "Your seven worlds" has 7 items, with Konkan & Malabar and Thar visited (Goa, Jaipur).
  - The "Next to unlock" text is present.
  - Marks: First steps is earned, and Storyteller is listed as not yet earned.
  - Visa pages: 2 completed stamps plus 1 "in N days" stamp.
  - The prompt "How was Jaipur?" opens the Jaipur journal sheet. Choosing 4 diyas, typing a memory and saving
    shows the toast "Memory saved", and the Jaipur stamp then shows its rating.
  - DiyaRating: arrow keys change the value, and each radio is labelled "N diyas".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, following the approved mockup. The quota meter stays under the visa pages, and
  logout moves into the Account page's Security section.
- [ ] **Step 4: Run** the frontend suite plus tsc. Expected: green.
- [ ] **Step 5: Commit.** `feat(frontend): the new Passport — cover, seven worlds, Yatra marks and visa-page journals`

### Task 11: Friends page, public passports, invite links

**Files:**
- Create:
  - `frontend/src/pages/FriendsPage.tsx` (route `passport/friends`)
  - `frontend/src/pages/PublicPassportPage.tsx` (route `u/:username`, public)
  - `frontend/src/pages/JoinPage.tsx` (route `join/:code`, protected)
  - `frontend/src/features/friends/{FriendCard,FindByUsername,InviteLink,RequestList}.tsx`
  - `frontend/src/features/friends/hooks.ts`
- Modify:
  - `frontend/src/router.tsx`
  - `frontend/src/components/layout/Navbar.tsx` (and the bottom tab bar's Passport item: a dot with the label
    "N friend requests" when `incoming.length > 0`)
- Test: `frontend/src/pages/FriendsPage.test.tsx`, `frontend/src/pages/PublicPassportPage.test.tsx`

**Interfaces:**
- The Friends page has sections "Invite link" (Copy and New link), "Add by username", "Requests" (incoming
  Accept/Decline, sent Cancel) and "Friends" (cards plus a ⋯ menu with Remove friend and Block).
- The public passport uses `PassportView` with `mine={false}` and the visitor's relation button ("Add friend" /
  "Request sent" / "Friends ✓" / hidden for self). The page is tinted in the owner's `theme` while it's open
  and restored on leaving. The 404 state reads "This passport is private".
- The Join page shows the inviter's card and "Become friends", then goes to `/passport/friends` with the toast
  "You and {name} are now friends".

- [ ] **Step 1: Failing tests.**
  - The Friends page lists Kabir and shows Zoya's incoming request. Accept moves Zoya into Friends.
  - Add by username `meera` shows her card, and Send request then shows "Request sent".
  - Unknown → "No traveller with that username".
  - `/u/meera` while logged out shows her cover and stamps.
  - `/u/kabir` while logged out shows "This passport is private".
  - `/join/<demo invite code of meera>` while logged in as demo → Become friends → the toast.
  - The navbar shows the requests dot label.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the frontend suite plus tsc. Expected: green.
- [ ] **Step 5: Commit.** `feat(frontend): friends, public passports and invite links`

### Task 12: Real end-to-end check and docs

**Files:**
- Modify:
  - `README.md` (the features table, plus a "Still to set up: Cloudinary, Brevo" note)
  - `backend/README.md` (new endpoints, env settings)
  - `backend/.env.example`

- [ ] **Step 1:** with `npm run dev` (real API) and Edge via playwright-core in the scratchpad:
  1. Sign up two users, A and B.
  2. A uploads an avatar and sets a bio and type.
  3. The planner refuses past dates, so give A one completed trip through a test-only seed script,
     `backend/scripts/e2e-seed.ts`. It refuses to run when `NODE_ENV=production`.
  4. A writes a journal with 1 photo.
  5. A sends B an invite link, and B accepts.
  6. B opens `/u/<A>` and sees A's stamp, rating and photo.
  7. A switches privacy to Only me, and B gets "private" plus a 404 photo.
  8. A deletes the account.
  9. Screenshots: passport, account, friends, public passport.
  10. Remove the e2e users afterwards.

  Expected: all of it works, with no console errors apart from the known logged-out refresh 401.
- [ ] **Step 2:** update the docs.
- [ ] **Step 3:** run both suites plus both typechecks. Expected: green.
- [ ] **Step 4: Commit.** `docs: profiles, passports and friends`
