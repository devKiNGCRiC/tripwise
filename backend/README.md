# TripWise API

The backend for TripWise: accounts, saved trips, share links and AI-written itineraries.
Built with Node.js, Express 5, TypeScript and MongoDB, and runs entirely on free tiers.

## How it works

```
website ──/api──► Express API ──► MongoDB Atlas (users, trips, daily usage, plan cache)
                       │
                       └──► AI fallback chain: Gemini Flash → Gemini Flash-Lite → Groq gpt-oss → Groq Qwen
```

- **Same contract as the website's mock.** The API returns exactly the shapes in
  `frontend/src/lib/api/types.ts`, so the website switches from demo to real with `VITE_USE_MOCKS=false`.
- **Validated AI answers.** Each model must answer in our JSON shape, and the answer is then checked for the
  right number of days, the right number of stops for the pace, and times in order. A slow (25 s of silence),
  broken or wrong answer passes the request to the next model. If every model fails, the traveller sees
  "our planners are busy" and the attempt doesn't count against their daily plans.
- **Streaming.** `POST /api/itineraries/generate/stream` sends the trip day by day while the AI writes it.
- **Places catalogue.** `src/data/destinations.json` and `src/data/places.json` hold 50 destinations and
  1,028 places at 44 Indian ones (all seven worlds), built by `npm run import:catalogue` from Wikidata (CC0)
  with credited Wikimedia Commons photos. The website's demo mode reads the same two files.
- **Grounded plans.** For a catalogue destination (found however it's typed: "Hampi, Karnataka", "Leh",
  "Alleppey"), the AI gets a shortlist of real places that suit the traveller's interests, and stops that
  name a catalogue place are saved with its id and coordinates.
- **Our own planner.** `services/localPlanner.ts` builds a trip from catalogue places with no AI: days that
  stay in one area, timed by pace, with a lunch break and transfers by distance. It answers
  `POST /itineraries/quick` (free and unlimited) and takes over automatically when every AI model is down.
- **Plan cache.** Up to 3 AI plans are kept per kind of trip (place, length, month, group, pace, interests,
  budget band). Once 3 exist, similar requests get one instantly. That doesn't use the allowance, and nobody
  gets the same plan twice.
- **Safe logins.**
  - Passwords are hashed with bcrypt.
  - Access tokens last 15 minutes.
  - An httpOnly refresh cookie lasts 30 days and is replaced each time it's used.
  - A replaced cookie that's used again later is treated as stolen, and that login is ended everywhere.
  - Two tabs refreshing at the same moment are fine.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill it in:

   | Setting | What it is |
   |---|---|
   | `MONGO_URI` | MongoDB Atlas connection string, with `/tripwise` after `.mongodb.net` |
   | `JWT_SECRET` | Any random string of 32+ characters (signs login tokens) |
   | `GEMINI_API_KEY` | From aistudio.google.com/apikey (use its own project, so limits aren't shared) |
   | `GROQ_API_KEY` | From console.groq.com/keys |
   | `CLIENT_ORIGIN` | Where the website runs (default `http://localhost:5173`) |
   | `GEMINI_MODELS`, `GROQ_MODELS` | Models to try, in order (defaults are in `.env.example`) |

3. `npm run seed` loads the Explore destinations and their places. It's safe to run again.
4. `npm run dev` starts the API on http://localhost:4000.

For the website to use it: in `frontend/.env.local` set `VITE_USE_MOCKS=false`, then run `npm run dev` there.
Vite forwards `/api` to port 4000.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the API and restart it on changes |
| `npm test` | All tests (in-memory MongoDB and fake AI; never touches Atlas or real AI) |
| `npm run typecheck` | TypeScript check |
| `npm run build` / `npm start` | Production build, then run it |
| `npm run seed` | Load the destinations and places into MongoDB |
| `npm run import:catalogue` | Rebuild the places catalogue from Wikidata and Commons (a few minutes; needs internet) |
| `npm run smoke:ai` | Ask each real AI model for one small trip and report ok / invalid / error |

## Privacy in short

- Passports are visible to **Friends** (default), **Everyone** or **Only me**. Blocking hides both people from each other completely.
- Other people never see upcoming trips.
- Journal photos are private. Each photo link is signed for the person it was given to and expires within 2 hours, and the server checks every time that this person is still allowed. That means hiding your journal or blocking someone takes effect immediately.
- `npx tsx scripts/e2e-seed.ts <email>` gives a test account one finished trip (for trying journals). It refuses to run in production.

## Daily limits

Limits are set in `src/config/plans.ts`. A new day starts at midnight India time.

| | Free | Premium (not sold yet) |
|---|---|---|
| AI trip plans | 5 | 50 |
| "New idea" for one day | 15 | 150 |
| Longest trip | 14 days | 14 days |

## Endpoints (all under `/api`)

| Method & path | Login | What it does |
|---|---|---|
| `GET /health` | | Health check |
| `POST /auth/signup`, `/auth/login` | | Create an account / log in → `{ user, accessToken }` + cookie |
| `POST /auth/refresh`, `/auth/logout` | cookie | New access token / end the login |
| `GET /auth/me` | ✓ | The signed-in user |
| `GET /destinations`, `/destinations/:slug` | | Explore catalogue (filters: `vibe`, `budget`, `month`, `q`) |
| `GET /destinations/:slug/places` | | A destination's places, most famous first (filter: `interest`) |
| `POST /itineraries/generate` | ✓ | Plan a trip → `{ itinerary, quota }` |
| `POST /itineraries/generate/stream` | ✓ | The same, streamed as JSON lines |
| `POST /itineraries/quick` | ✓ | TripWise's own plan from the catalogue: no AI, no quota (404 `NO_CATALOGUE` elsewhere) |
| `GET /itineraries`, `/itineraries/:id`, `DELETE /itineraries/:id` | ✓ | My trips |
| `POST /itineraries/:id/days/:n/regenerate` | ✓ | A fresh idea for one day |
| `POST /itineraries/:id/share`, `GET /share/:shareId` | ✓ / | Share link / open a shared trip |
| `GET /me/quota` | ✓ | Today's AI plans used, limit and reset time |
| `GET`/`PATCH /me/profile`, `PUT`/`DELETE /me/avatar` | ✓ | Profile, preferences, privacy, theme; profile photo |
| `POST /me/password`, `POST /auth/logout-all`, `DELETE /me` | ✓ | Change password, sign out everywhere, delete account and all data |
| `POST /auth/forgot`, `POST /auth/reset` | | Email a reset link (always answers the same) / set a new password |
| `GET /me/passport`, `GET /users/:username/passport` | ✓ / opt. | My passport / someone's, as their privacy allows |
| `GET`/`PUT /itineraries/:id/journal`, `POST`/`DELETE …/journal/photos` | ✓ | Trip journal: diyas, memory, up to 6 photos |
| `GET /photos/:id`, `GET /avatars/:userId` | | Journal photo (signed per viewer, re-checked every time) / profile photo |
| `GET /friends`, `POST /friends/requests`, `…/accept`, `…/decline`, `DELETE …` | ✓ | Friends and requests |
| `POST`/`DELETE /blocks`, `GET /users/:username/card`, `GET`/`POST /invites/:code…`, `POST /me/invite-code` | ✓ | Blocking, finding by @username, invite links |
| `POST /tolis`, `GET /tolis`, `GET`/`PATCH /tolis/:id` | ✓ | Start a Toli (optionally from a trip), my Tolis with unread counts, one Toli, rename / announcement mode |
| `POST /tolis/:id/invite`, `GET /toli-invites/:token`, `POST …/join` | ✓ | New invite link (leaders), preview an invite, join |
| `POST /tolis/:id/members`, `PATCH`/`DELETE …/members/:userId`, `PATCH /tolis/:id/me` | ✓ | Add a friend, change a role or turn off their requests, remove or leave; share my phone |
| `GET`/`PUT`/`DELETE /tolis/:id/budget` | ✓ | My private budget range and the range that suits everyone |
| `GET /tolis/:id/activity` | ✓ | What happened in the Toli |
| `GET`/`POST /tolis/:id/sujhavs`, `PUT …/:sid/vote`, `POST …/:sid/approve`, `…/decline` | ✓ | Suggestions on the Sahyatra (leaders approve or decline) |
| `GET`/`POST /tolis/:id/polls`, `PUT …/:pid/vote`, `POST …/:pid/close` | ✓ | Polls: Tithi (dates), destination, transport, free |
| `GET`/`POST /tolis/:id/messages`, `POST …/messages/photos`, `POST /tolis/:id/read` | ✓ | Chaupal (chat): messages (`clientId` makes retries safe), photos, mark read |
| `GET`/`POST /tolis/:id/anurodh`, `POST …/anurodh/:rid/decide` | ✓ | Raise a hand in announcement mode; leaders allow (1 message, 30 min, 1 hour, whole trip), reply privately or decline |
| `GET`/`POST /tolis/:id/expenses`, `DELETE …/expenses/:eid` | ✓ | Lekha: group expenses split among those who shared (equal / amounts / shares, in paise) and personal ones only the owner sees; `clientId` makes offline retries safe; deleting marks it deleted |
| `POST /tolis/:id/settlements`, `GET /tolis/:id/lekha` | ✓ | Record a payment back (never deleted); balances, the fewest payments to settle up (with a `upi://pay` link when the payee shared a UPI ID), totals and TripWise's estimate |
| `GET`/`POST /tolis/:id/splits`, `POST …/splits/:sid/approve`, `DELETE …/splits/:sid` | ✓ | Dharas: split a day (or fixed groups for college/office) meeting at a Sangam; a Sahyatri's split waits for a leader |
| `POST …/splits/:sid/dharas/:did/join` \| `leave`, `POST`/`DELETE …/splits/:sid/here` | ✓ | Move between Dharas (one per split); "I'm here" at the Sangam and the headcount |
| `PUT`/`DELETE /tolis/:id/location`, `GET /tolis/:id/locations` | ✓ | Share where you are for 1 hour / until the Sangam / until the trip ends (last point only, removed when it ends); who is near which catalogue place |
| `GET`/`POST /tolis/:id/notes`, `PATCH`/`DELETE …/notes/:nid` | ✓ | Notes for the whole trip or a day (the author or leaders edit) |
| `GET`/`POST /tolis/:id/potli`, `POST`/`DELETE …/potli/:pid/claim`, `PATCH`/`DELETE …/potli/:pid` | ✓ | Potli: group items someone claims and packs; my own list only I see |
| `GET`/`PATCH /me/kushal`, `POST`/`DELETE /me/kushal/contacts…`, `POST /me/kushal/checkin`, `GET /kushal/:token` | ✓ / | Kushal: family contacts with private links, automatic check-ins on/off, check in; the family's page (no login) shows only the first name and the latest check-in, rounded |

`PATCH /tolis/:id/me` also takes `upi` (a UPI ID shared with that Toli only). Nobody leaves, or is removed,
while they owe or are owed money (409 "Settle up first").

Toli rules: someone who isn't in the Toli gets 404; a member acting above their role gets 403; a clash with
the current state (e.g. voting in a closed poll) gets 409 `CONFLICT`.

Errors always look like `{ "error": { "code": "…", "message": "…" } }`.
