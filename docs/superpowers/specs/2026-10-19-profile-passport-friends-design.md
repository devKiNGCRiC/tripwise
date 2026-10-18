# Profile, Passport & Friends — design

Status: draft for the owner's approval · 2026-10-19
Follows: `2026-10-18-backend-ai-design.md` (the real backend). The next project is Crew mode
(planning a trip together), which builds on the profiles and friendships made here.

## 1. Intent

Today the Passport page is a thin profile: a cover, a few stamps, the AI quota and two settings. For a real
product it needs everything people expect from an account (photo, bio, password, privacy, deleting your data).
It also needs a reason to come back after a trip. The owner wants it to stand out from other travel apps and
match TripWise's look and motto (*Plan less. Wander more.*, India's seven worlds, a passport that fills up).

The owner reviewed three directions (Booklet, Seven Worlds collection, Travel journal) and chose to **combine
all three**. They then added **bio, type of traveller and friends**. Friends should eventually let people do
everything they'd do planning with friends in real life. That planning-together part is **Crew mode, the next
project**. This project lays its foundation: profiles, usernames, friendships and privacy.

### Goals
- **Who you are, where you've been, what you remember.** One Passport page in three parts:
  1. **Cover (Booklet):** a navy passport cover with your photo and a gold seal, your name, your Hindi
     heading, your home city, your bio and traveller type, and your numbers (trips, worlds, days away,
     Yatra marks). It ends with a passport-style code line.
  2. **Where you've been (Seven Worlds):** India's seven worlds, lit when visited, with a nudge to the next one
     at its best season, plus **Yatra marks**: badges earned from real travel.
  3. **What you remember (Journal as visa pages):** each finished trip leaves an ink stamp, and an upcoming trip
     shows a dashed stamp with a countdown. Tapping a stamp opens that trip's **journal**: a rating in
     **diyas** (1–5), a written memory, up to 6 photos, and "use these photos to theme my TripWise". A
     finished trip with no journal asks "How was Goa?".
- **Account tab with all the basics:** name, @username, photo, bio, traveller type, home city, travel
  preferences that pre-fill the planner, theme and motion, change password, forgot password (email),
  sign out on all devices, privacy, delete my account and all my data.
- **Friends:**
  - Send and accept requests by **@username** or a personal **invite link**.
  - A friends strip on your passport.
  - Open a friend's **public passport** (`/u/:username`).
  - Remove or block someone.
  - Privacy decides who sees your passport.
- **Free to run.** Everything stays inside free tiers.

### Non-goals (later)
- Planning a trip together, shared expenses, comments, votes, shared albums: **Crew mode** (next project).
- Browsing or searching strangers. People connect only by exact @username or invite link.
- Chat or messages, a notifications inbox, push or email notifications other than password reset.
- Google sign-in, admin tools, paid plans.

### Anti-goals
- A page that looks like a generic settings form. The Passport must feel like an object you collect in.
- Showing anyone's passport, journal or photos to people the owner didn't allow.
- Any way to discover or message strangers.
- Badges you can buy or that nag. Marks are earned only by travelling.
- Breaking mock mode. Every new endpoint also exists in the mock API, so the UI works without a backend and
  the frontend tests keep running on MSW.

## 2. Constraints
- **Free tiers only:** MongoDB Atlas M0 (512 MB total), Render free, Brevo free email (300/day) for password
  reset, and an image host decided in §6.
- **Same contract rule as before:** the real API and the mock return identical shapes and error codes.
- **Code style:** comment everything (file headers, every function and block). Never credit Claude anywhere.
- **Design:** Seven Worlds look: glass panels over the living landscape, Fraunces / Plus Jakarta / Tiro
  Devanagari, laptop-first and good on phones.
- **Accessibility:** works with a keyboard and screen readers. Stamps and marks have text labels. Photo upload
  has alt text.

## 3. What a traveller sees

### Routes
| Route | Who | What |
|---|---|---|
| `/passport` | me | My passport (cover, worlds and marks, visa pages and journal, friends strip) |
| `/passport/account` | me | Account tab (profile, preferences, privacy, security, danger zone) |
| `/passport/friends` | me | Friends, requests (incoming and sent), invite link, find by @username |
| `/u/:username` | anyone allowed | Someone's public passport (read-only), with "Add friend" |
| `/join/:inviteCode` | logged in | Accept an invite link: confirm to become friends |
| `/reset-password/:token` | logged out | Set a new password from the email link |

### Cover
- **Photo:** square, cropped in the browser, shown like a passport photo with a gold TripWise seal over its
  bottom-right corner. Without a photo, show initials on the world colour.
- **Name and @username**, the Hindi heading "यात्री पासपोर्ट", home city, a **bio** of up to 160 characters, and
  the **traveller type** as a chip.
- **Traveller types:** Solo explorer · Backpacker · Couple getaways · Family planner · Group organiser ·
  Luxury escapist · Foodie · Culture seeker · Adventure junkie · Slow traveller. Pick one, or leave empty.
- **Numbers:** completed trips, worlds visited (x/7), days away (sum of completed trips' days), Yatra marks
  earned.
- **Code line:** passport-style, built from name, username and month joined, e.g.
  `P<IND<RAO<<ASHA<<<<TRAVELLER<SINCE<SEP26<<`. It's decorative and hidden from screen readers.
- **Buttons:** "Edit profile" (goes to Account) and "Friends · N" (with a dot when requests are waiting).

### Seven worlds and Yatra marks
- **The seven worlds** appear as seven discs in their own colours. A world is lit when the traveller has a
  **completed** trip in it. Abroad trips count separately ("Beyond India · 2").
- **Next to unlock:** the first unvisited world (in the regions' order) whose best months include one of the
  next 3 months, else the first unvisited world. The line reads "Next to unlock: Western Ghats. Best Jun to Sep
  for the monsoon green. Plan it →", and the link opens the planner with a matching destination prefilled.
- **Where a trip's world comes from:** the AI now returns the trip's `region` (one of the seven, `abroad`, or
  `none`) as part of every new itinerary. Catalogue destinations already carry a region, and the catalogue
  wins when it has one. Trips saved before this change use the catalogue region if the name matches, else none.
- **Yatra marks** are computed from completed trips and journals. Each has an emoji, a name, a one-line
  "how to earn" and an earned date.

  | Mark | Earned by |
  |---|---|
  | 🎒 First steps | 1 completed trip |
  | 🧭 Wanderer | 3 completed trips |
  | 🏔 Mountain goat | a trip in the Himalaya |
  | 🏜 Desert wind | a trip in the Thar |
  | 🌊 Coast calling | a trip in Konkan & Malabar, or abroad to a catalogue destination tagged `beach` |
  | 🌧 Monsoon chaser | a trip starting in June–September |
  | 👨‍👩‍👧 Family yatri | a family trip |
  | 🛣 Long road | one trip of 7+ days |
  | ✍️ Storyteller | 3 journal memories written |
  | 🌏 Beyond India | a trip abroad |
  | 🗺 Three worlds | 3 worlds visited |
  | 🪷 All seven worlds | all 7 visited |

  Unearned marks show greyed with their "how to earn" line. "Next" suggests the closest unearned one.

### Visa pages and the journal
- **Stamps:**
  - Every **completed** trip (end date before today, India time) gets a round ink stamp: the destination in
    capitals, month and year, the Hindi name when known, and a colour and tilt taken from its world.
  - **Upcoming** trips show a dashed stamp with "in N days".
  - 9 stamps per page, with ◀ ▶ to turn pages and newest first.
- **Opening a stamp** shows its journal page beside the stamps on a laptop, or as a sheet on a phone.
  - **Rating:** five diyas, tap to light 1–5.
  - **Memory:** up to 1,000 characters.
  - **Photos:** up to **6**, each resized in the browser to at most 1600 px on the long side and saved as WebP or
    JPEG at around 85% quality before upload. Each has optional alt text.
  - **"Use these photos to theme my TripWise":** reads a palette from the trip's photos with the existing
    `paletteFromPixels` and saves it as the traveller's theme, which tints the living world everywhere. A
    "Back to world colours" button undoes it. The saved theme follows the account to every device; while
  signed in it takes the place of the landing page's on-device "Your colours" (whichever was set last wins,
  and setting either saves to the account). Opening someone's passport shows it in *their* colours.
  - **"Open itinerary"** link.
- **Prompt:** completed trips without a journal show "✍️ How was {place}?" above the stamps (the newest one).
- Only the trip's owner can write its journal.

### Account tab (`/passport/account`)
Sections, top to bottom:
1. **Profile:**
   - photo: upload, crop to square, remove
   - name, @username, bio, traveller type, home city
2. **Travel preferences:** usual budget per day, interests (up to 5), pace and who usually travels. The planner
   pre-fills new trips from these. A destination from the URL still wins.
3. **Privacy:**
   - Who can see my passport: **Friends** (default) · **Everyone** (anyone, even logged out, who opens `/u/:username`) · **Only me**.
   - "Show my journal memories and photos to people who can see my passport" (on by default).
4. **Look & feel:** the existing theme and Calm/Full motion controls move here from the passport page.
5. **Security:**
   - **change password** (current + new). The other devices are signed out.
   - **sign out on all devices**
6. **Danger zone:** **delete my account**. Type your password, then confirm. This permanently removes the user,
   their trips, journals, photos, sessions, usage, friendships and cached share links.

The AI quota meter stays on the passport page, under the visa pages.

### Friends (`/passport/friends`)
- **Invite link:** `tripwise…/join/<code>`, with a Copy button and a "New link" button (the old link stops working).
- **Add by @username:** an exact match only. It shows the person's card, then "Send request".
- **Requests:** incoming (Accept / Decline) and sent (Cancel).
- **Friends list:** photo, name, @username, traveller type and number of trips, linking to their passport. A ⋯ menu
  has Remove friend and Block.
- **Blocking:** removes any friendship or request, and stops the blocked person from finding you, sending
  requests or seeing your passport, whatever your privacy setting. The blocked person isn't told.
- **The invite link** (`/join/:code`) shows the inviter's card and "Become friends". Confirming creates the
  friendship directly (the link is the invitation). Opening your own link says so.
- **Limits:** at most 20 pending sent requests, and at most 30 requests per day (stops spam).

### Someone else's passport (`/u/:username`)
- The same cover, worlds, marks and stamps as yours, read-only.
- Journals (rating, memory, photos) only if their journal setting allows.
- **Not shown:** account details, upcoming trips (only completed trips appear, so nobody learns when your home
  is empty), quota and email.
- **Button:** "Add friend" / "Request sent" / "Friends ✓".
- **Not allowed** (private, not friends, blocked, or no such user): it answers "This passport is private", and
  doesn't reveal which of those reasons applies.

### Forgot password
- **Login page:** "Forgot password?", then enter your email. The page always says "If that email has an account,
  we've sent a reset link", so it doesn't reveal which emails exist.
- **The email** (Brevo) has a link to `/reset-password/<token>`.
- **The token:** random, stored as a hash, valid for 30 minutes and single-use. Setting a new password signs out
  every device.
- **Limits:** 3 reset emails per hour per email, and 10 per hour per IP.

## 4. Data and API (decided)

### User (additions)
- `username`: unique, lower-case, 3–20 characters of `a–z 0–9 _`, not starting with a digit. Existing users
  (and new signups, so the signup form stays short) get one made from their name plus digits. It can be
  changed in Account, at most once a day. Reserved words aren't allowed (admin, tripwise, passport, join, api,
  login, signup, u, me, help, support).
- `bio` (≤160), `travellerType` (enum above or null), `homeCity` (≤80).
- `avatar`: `{ version }` or null. The image itself is stored separately (§6).
- `preferences`: `{ budget?, interests?, pace?, travellers? }`.
- `privacy`: `{ passport: 'friends' | 'everyone' | 'private', showJournal: boolean }`.
- `theme`: a palette `{ colours… }` or null (from trip photos); included in the passport payload so visitors see it.
- `inviteCode`: random, 10 characters, can be regenerated.
- `usernameChangedAt`.

### New collections
- `journals`: `{ itineraryId (unique), ownerId, rating 1–5|null, memory ≤1000, photos: [{ id, url, width,
  height, alt }] ≤6, updatedAt }`.
- `friendships`: `{ users: [a, b] sorted, status: 'pending' | 'accepted', requester, createdAt, acceptedAt }`.
  Unique on the pair.
- `blocks`: `{ blocker, blocked }`. Unique.
- `passwordResets`: `{ userId, tokenHash, expiresAt (TTL), usedAt }`.
- `Itinerary.region`: `'himalaya' | … | 'sisters' | 'abroad' | null`. The AI schema gains `region` (enum
  including `abroad` and `none`).

### Endpoints (all under `/api`; ✓ = login)
| Method & path | | Purpose |
|---|---|---|
| `GET /me/profile` | ✓ | My full profile, preferences, privacy, theme |
| `PATCH /me/profile` | ✓ | Update name, username, bio, type, home city, preferences, privacy, theme |
| `PUT /me/avatar` / `DELETE /me/avatar` | ✓ | Upload (already square and resized, ≤ 300 KB) / remove photo |
| `GET /avatars/:userId` | | The avatar image (cache headers; `?v=` busts) |
| `POST /me/password` | ✓ | Change password (current + new); revokes other sessions |
| `POST /auth/logout-all` | ✓ | Revoke every session of mine |
| `DELETE /me` | ✓ | Delete account (password in the body) and all data |
| `POST /auth/forgot` / `POST /auth/reset` | | Send reset email (always 200) / set new password from token |
| `GET /me/passport` | ✓ | My passport: cover, stats, worlds, next world, marks, stamps (with journal summaries) |
| `GET /users/:username/passport` | opt. | Someone's passport by privacy and blocks, or 404 "This passport is private" |
| `GET /itineraries/:id/journal` / `PUT …/journal` | ✓ | Read / save rating, memory, photo list (owner, completed trips only) |
| `POST /itineraries/:id/journal/photos` / `DELETE …/photos/:photoId` | ✓ | Add (≤6) / remove a journal photo |
| `GET /friends` | ✓ | Friends + incoming + sent requests |
| `POST /friends/requests` `{ username }` | ✓ | Send a request (or accept straight away if they already asked me) |
| `POST /friends/requests/:id/accept` · `/decline` · `DELETE /friends/requests/:id` | ✓ | Answer / cancel |
| `DELETE /friends/:userId` | ✓ | Remove a friend |
| `POST /blocks` `{ userId }` / `DELETE /blocks/:userId` | ✓ | Block / unblock |
| `GET /users/:username/card` | ✓ | Small card for "add by @username": 404 "No traveller with that username" if blocked either way or their passport is Only me |
| `GET /invites/:code` / `POST /invites/:code/accept` | ✓ | Inviter's card / become friends |
| `POST /me/invite-code` | ✓ | New invite link |

**Passport payload (shared by mine and public):** cover (name, username, avatarUrl, bio, type, homeCity,
joined), stats, worlds (7 × visited), abroadCount, nextWorld, marks (all, with earned dates), stamps (id,
destination, localName, region, start/end, status completed|upcoming, journal summary: rating, has memory,
photo count, first photo url when allowed). Public passports leave out upcoming stamps.

**Errors:** the same codes as before. Names taken: 409 VALIDATION "That username is taken". Wrong current
password: 400 VALIDATION. Too many requests: 429 QUOTA_EXCEEDED with a friendly message.

## 5. Mock mode
The MSW mock implements every new endpoint with the same rules. The demo user `u_demo` gets:
- a profile: Asha-style bio, Foodie, home city Pune
- two completed trips with journals: Goa rated 5 with a memory and 2 photos, and Jaipur with no journal, which
  triggers the prompt
- one upcoming trip
- two friends, one pending incoming request and one sent request
- one public demo passport at `/u/meera`

Uploads in mock mode keep photos as data URLs in memory (lost on reload, like the rest of the mock's
non-trip data).

## 6. Photo storage
- **Avatars:** tiny (cropped 256×256, about 20 KB). Stored in MongoDB (`avatars` collection, binary) and served
  by `GET /avatars/:userId` with long cache headers. That's free and needs no extra account.
- **Journal photos** (up to 6 per trip, about 150–300 KB each), stored on **Cloudinary's free plan** (no card
  needed, about 25 GB of storage and bandwidth a month) as **private** images. The browser uploads straight to
  Cloudinary with a one-time signature from our API. Photos are **viewed through our API**:
  `GET /photos/:photoId` checks that the viewer is allowed (the owner, or someone allowed to see that passport's
  journals), then streams the image from Cloudinary.
  - So hiding journals, blocking someone or deleting the account takes effect at once. Normal Cloudinary links
    are public and permanent, so those aren't used.
  - Photos are deleted from Cloudinary when removed or when the account is deleted.
  - If Cloudinary isn't configured (local dev without keys), uploads are stored in MongoDB instead, through the
    same `GET /photos/:photoId`.

## 7. Left to the builder
- The exact visual design of the cover, discs, stamps and journal sheet, within Seven Worlds and the approved
  mockup (`.superpowers/brainstorm/…/passport-combined.html`).
- The crop UI (a simple square crop with zoom slider is enough), page-turn animation (respecting Calm motion),
  wording of empty states and marks.
- How the planner prefill merges with URL parameters (URL wins for destination; preferences fill the rest).

## 8. Owner's answers (after the builder check)
- **Cloudinary (photos) and Brevo (emails): yes, but set up later**, once the project is about 80% done. So this
  project builds both with fallbacks that switch over by themselves when keys appear in `backend/.env`:
  - photos are stored in MongoDB until `CLOUDINARY_*` keys exist (the same `GET /photos/:photoId` serves both)
  - reset emails are written to the API log until `BREVO_API_KEY` and a sender exist
  The README lists both as setup steps still to do.

## 9. Calls made while writing this (mine, not the owner's)
- Usernames are auto-made at signup and changeable later (keeps signup short).
- Stamps only for completed trips. Upcoming trips appear as dashed stamps on my passport only.
- Public passports never show upcoming trips (safety).
- Default privacy is Friends. Journals follow the passport's visibility, with an on/off switch.
- The invite link makes friends straight away after confirming. Requests by @username need accepting.
- The AI returns a trip's world (`region`), so any destination can light a world.
- Avatars are stored in MongoDB. Journal photos are private on Cloudinary and served through our API, so privacy changes take effect instantly.
- "Only me" passports can't be found by @username; invite links always work (the owner shared them on purpose).
- `APP_URL` env setting holds the website address used in emails and invite links (`http://localhost:5173` in dev).
- In development without email keys, the reset link is printed in the API log instead of emailed.
- Spam limits: 20 pending sent requests, 30 requests a day, 3 reset emails an hour.
- The theme and motion controls move from the passport page into Account.
