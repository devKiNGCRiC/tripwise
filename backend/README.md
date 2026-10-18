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

3. `npm run seed` loads the 12 Explore destinations. It's safe to run again.
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
| `npm run seed` | Load the destinations into MongoDB |
| `npm run smoke:ai` | Ask each real AI model for one small trip and report ok / invalid / error |

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
| `POST /itineraries/generate` | ✓ | Plan a trip → `{ itinerary, quota }` |
| `POST /itineraries/generate/stream` | ✓ | The same, streamed as JSON lines |
| `GET /itineraries`, `/itineraries/:id`, `DELETE /itineraries/:id` | ✓ | My trips |
| `POST /itineraries/:id/days/:n/regenerate` | ✓ | A fresh idea for one day |
| `POST /itineraries/:id/share`, `GET /share/:shareId` | ✓ / | Share link / open a shared trip |
| `GET /me/quota` | ✓ | Today's AI plans used, limit and reset time |

Errors always look like `{ "error": { "code": "…", "message": "…" } }`.
