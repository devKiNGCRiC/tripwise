# TripWise — Frontend

React + TypeScript web app for **TripWise**, the AI travel itinerary planner.
Design: **"The Descent"**. The home page is a scroll-driven 3D world (Three.js), flying from the sky down to
the fields, with an instant photo fallback. The Indian touches include a railway departure-board headline,
truck-art colours and bilingual station signs.
Fonts: Anybody (stretched display) and Mukta (body text and Hindi). Design references: `docs/design/`.

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local   # mock backend ON by default
npm run dev                  # http://localhost:5173
```

Demo accounts (mock mode):

| Email | Password | Role |
|---|---|---|
| demo@tripwise.app | password123 | user |
| admin@tripwise.app | admin12345 | admin |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit/integration tests (Vitest + Testing Library + MSW) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Type-check + production build into `dist/` |

## Environment variables

| Variable | Example | Meaning |
|---|---|---|
| `VITE_API_URL` | `/api` or `https://tripwise-api.onrender.com/api` | Where the API lives |
| `VITE_USE_MOCKS` | `true` / `false` | `true` = in-browser mock backend (MSW) |

## How it fits together

```
src/
  scene/        The Descent: quality choice, photo pack, 3D world (worker-built terrain, sky, water, effects)
  theme/        tokens.css (ALL colours/shadows/fonts) + ThemeProvider
  components/   ui/ (Button, Chip, Input, Card, Ticket, Stamp, Toast…) · layout/ (navbar, guards…)
  features/     auth/ · explore/ · landing/   (Plan 2 adds planner/, trips/, passport/)
  pages/        one thin file per route
  lib/api/      types (the API contract), fetch client, endpoint helpers
  mocks/        MSW mock backend: seed data + handlers
```

- **Restyle the app:** edit `src/theme/tokens.css` only.
- **Switch to the real backend:** set `VITE_USE_MOCKS=false` and `VITE_API_URL` to the Render URL.
  The mock API and the real API share the contract in `src/lib/api/types.ts`.
- **Cold starts:** requests slower than 3s show a "waking up the server" banner (Render free tier sleeps).

## Deploy (free) — Cloudflare Pages

Cloudflare Pages' free plan allows commercial use (ads included) and has a built-in
single-page-app fallback: with no `404.html`, every URL is served `index.html`, so deep links
like `/trips/123` work without any config file.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick `tripwise`.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | None (or Vite) |
   | Root directory | `frontend` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

3. Environment variables: `NODE_VERSION=24`, `VITE_API_URL=/api`, `VITE_USE_MOCKS=true`
   (switch to the Render URL and `false` once the backend is live).
4. Every push to `main` redeploys; every other branch gets its own preview URL.
