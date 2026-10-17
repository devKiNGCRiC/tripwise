# ✈️ TripWise

**Plan less. Wander more.** TripWise is an AI-powered travel planner. Tell it where you're going, your dates, budget,
travel crew and vibe, and it builds a day-by-day itinerary with costs, local tips and a packing list.
You can then save it, download it as a PDF, or share it with your friends.

> 🚧 **Status: in active development.** The web frontend foundation is done and runs on a built-in mock API.
> The real backend and AI planning are next. See the [roadmap](#-roadmap).

---

## ✨ Features

| | Feature | Status |
|---|---|---|
| 🔐 | Sign up / log in (email + Google), secure JWT sessions | ✅ Frontend done (mock API) |
| 🏠 | Landing page with trending destinations | ✅ Done |
| 🏞️ | "Seven Worlds": a living, hand-drawn landscape of seven Indian regions behind every page | ✅ Done |
| 🌗 | Day and Night for every world, region colours, photo-tinted personalisation, Calm motion | ✅ Done |
| 📱 | Mobile-first layout with an app-style bottom tab bar | ✅ Done |
| 🧭 | Explore destinations by vibe, budget and best season | 🛠️ Next |
| 🪄 | Trip planner wizard + AI itinerary generation | 🛠️ Next |
| 🎟️ | Boarding-pass itinerary view, PDF download, share link | 🛠️ Next |
| 🛂 | "Passport" profile that collects a stamp for every trip | 🛠️ Next |
| 📊 | Admin dashboard: analytics, destinations, users, moderation | 📅 Planned |
| 📲 | React Native mobile app | 📅 Phase 2 |

## 🎨 Design: "Seven Worlds"

India is not one place, so TripWise isn't one look. The whole site floats as frosted glass over a
**living landscape drawn live in your browser**: seven regions divided by landscape, not state lines.

| World | You'll see |
|---|---|
| Himalaya | snow peaks, pine ridges, drifting mist; stars and falling snow at night |
| Thar | dunes, a golden fort, a camel caravan, blowing sand; a sky full of stars |
| Gangetic Plains | the ghats' temple skyline, boats and kites over the river; floating diyas at night |
| Deccan Plateau | mesas, Hampi-style boulders and ruins; fireflies at night |
| Western Ghats | monsoon rain, rolling cloud, waterfalls on green ridges |
| Konkan & Malabar | sea, breaking waves, sun glitter, swaying palms |
| Seven Sisters | tea terraces disappearing into mist; fireflies at night |

- **Always moving:** the layers shift with your mouse and as you scroll, and the homepage tours the seven
  worlds until you pick one. TripWise remembers your pick.
- **Day and Night** for every world; the interface takes on each world's colours.
- **Region dossier:** elevation, terrain, a 12-month "when to go" chart, signature experiences and places.
- **For every traveller:** Solo, Friends, Backpackers, Family and Couples each change what the plan offers.
- **Your colours:** pick a photo from a trip you loved and its colours tint the whole world
  (read on your device, never uploaded), or use your location to see the world nearest you.
- **Fonts:** Fraunces (headlines), Plus Jakarta Sans (interface), Tiro Devanagari Hindi (Hindi).
- **Calm mode** (Passport page) and the OS "reduce motion" setting hold the world still.

Design spec: `docs/superpowers/specs/2026-10-17-seven-worlds-design.md` · prototype: `docs/design/tripwise-living.html`.

## 🧰 Tech stack (100% free tiers)

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod, Canvas 2D (procedural landscapes), Lenis |
| Backend | Node.js, Express, MongoDB (Mongoose) |
| AI | Google Gemini Flash-Lite (primary) with Groq (`gpt-oss-120b`) as automatic fallback |
| Database | MongoDB Atlas (free M0 cluster) |
| Hosting | Cloudflare Pages (frontend), Render (backend) |
| Testing | Vitest, Testing Library, MSW (mock API) |

The app is designed around free-tier limits. AI results are cached, each user gets a daily generation allowance,
and a friendly "waking up the server" banner covers the free backend's cold starts.

## 📁 Project structure

```
tripwise/
├── frontend/     React + TypeScript web app (see frontend/README.md)
├── backend/      Node.js + Express API (in progress)
└── docs/
    ├── SRS.md                  Software requirements
    └── superpowers/
        ├── specs/              Design specifications
        └── plans/              Step-by-step implementation plans
```

## 🚀 Getting started

**Requirements:** Node.js 22 or newer.

```bash
git clone https://github.com/devKiNGCRiC/tripwise.git
cd tripwise/frontend
npm install
cp .env.example .env.local    # mock API is on by default; no backend or API keys needed
npm run dev                   # → http://localhost:5173
```

Demo accounts (mock mode):

| Email | Password | Role |
|---|---|---|
| `demo@tripwise.app` | `password123` | Traveller |
| `admin@tripwise.app` | `admin12345` | Admin |

Useful scripts (run inside `frontend/`):

```bash
npm test            # unit + integration tests
npm run typecheck   # TypeScript check
npm run lint        # ESLint
npm run build       # production build → dist/
```

## 🗺️ Roadmap

- [x] **Frontend foundation:** theme, UI kit, auth pages, routing and guards, mock API, landing page
- [ ] **Traveller features:** explore, trip planner, AI itinerary view, PDF, sharing, passport stamps
- [ ] **Admin:** dashboard and management tools, plus end-to-end tests
- [ ] **Backend:** Express API, MongoDB models, JWT auth, Gemini + Groq integration, caching and quotas
- [ ] **Launch:** deploy to Cloudflare Pages + Render
- [ ] **Phase 2:** React Native app, social sharing, AI chat assistant

## ☁️ Deployment

The frontend deploys to **Cloudflare Pages** from the `main` branch (free plan, commercial use allowed).
Step-by-step settings are in [`frontend/README.md`](frontend/README.md#deploy-free--cloudflare-pages).

## 🤝 Contributing

This is a personal project, but ideas and bug reports are welcome. Please open an issue.
Work happens on feature branches that are merged into `main` once tests pass.

## 👤 Author

**devKiNGCRiC**: [github.com/devKiNGCRiC](https://github.com/devKiNGCRiC)
