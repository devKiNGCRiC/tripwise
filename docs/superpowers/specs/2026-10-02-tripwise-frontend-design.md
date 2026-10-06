# TripWise Frontend — Design Spec

**Date:** 2026-10-02
**Status:** Draft — awaiting review
**Scope:** Web frontend (Phase 1a). Backend is Phase 1b; React Native app is Phase 2 (separate specs).

---

## 1. Goals & Constraints

**Purpose (in priority order):** a real product people use, a learning project, and a portfolio piece.

**Hard constraints**
- **Zero cost.** Every library, font, image source and hosting service must be free with no card required.
- **Comment everything.** Every file starts with a header comment (what it is and why it exists). Every component, hook, function, module and meaningful block gets a comment explaining *why*.
- **Easy restyling.** The visual style must be changeable later from one theme file.
- **No AI attribution** in commits, code or docs.

**Success criteria**
- Every page in §4 works end to end against the mock API.
- The design is responsive from 360px phones to wide desktops.
- On a mid-range phone, a page loads in under 3s (Lighthouse Performance ≥ 85 on the landing page).
- Lighthouse Accessibility is ≥ 90, and the app is fully usable by keyboard.
- Unit tests and Playwright smoke tests pass.
- Switching from the mock API to the real backend means changing only one environment variable.

---

## 2. System Context (for reference)

| Layer | Choice (all free) |
|---|---|
| Frontend hosting | Cloudflare Pages (free plan; commercial use and ads allowed, SPA fallback built in) |
| Backend | Node.js and Express on Render's free plan (sleeps when idle, so cold starts take ~30s) |
| Database | MongoDB Atlas M0 |
| AI | Gemini Flash-Lite as primary (~500 RPD), with Groq `openai/gpt-oss-120b` as fallback (200K TPD). The backend caches results. |
| Per-user cap | 5 generations per user per day. The frontend shows the remaining count and the reset time. |
| PDF | Generated in the browser |

---

## 3. Visual Direction — "Passport Pop"

There is one rule for which style to use where:
- **Paper and stamps** for content (style A, Passport & Postcard)
- **Bold outlines** for anything tappable (style C, Neo-Brutalist)
- **Glow** for anything the AI or night mode does (style B, Aurora Glass)

**Day theme (light)**
- **Colours:** paper background `#FFF8EE` and ink `#1B1B1F`.
- **Accents:** coral `#FF6B5A`, mustard `#F4B942`, teal `#0F766E` and sky `#7CC6FE`.
- **Texture:** subtle paper grain made with a CSS noise SVG (no image request).

**Night Flight theme (dark)**
- **Colours:** navy `#0B1026` background, text `#F5F1E8`.
- **Panels:** glass panels using `backdrop-blur` at 10–14% white.
- **Glows:** aurora gradients in teal, violet and coral.

**Typography (via Fontsource)**
- **Headings:** *Bricolage Grotesque*, which is bold and characterful.
- **Body:** *Inter*.
- **Codes and labels:** *JetBrains Mono*, used for ticket codes and "boarding pass" labels.

**Interactive elements**
- **Borders:** 2–3px ink borders.
- **Shadows:** hard offset shadows (`4px 4px 0 ink`).
- **Press effect:** on press, the element moves by the shadow offset and the shadow disappears.

**Signature moments.** Each one is its own component, so it can be swapped out easily.
1. **StickerPicker:** interest chips "slap" onto a suitcase illustration, using spring animation and a slight rotation.
2. **GeneratingScreen:** an aurora glow behind a frosted card while a plane flies along a dotted SVG route. Rotating tip text keeps the user company through 5–20s waits.
3. **TicketUnfold:** itinerary days reveal in sequence, with a perforated stub that tears off.
4. **PassportStamp:** when a trip is saved, a stamp animates onto the passport page.

**Accessibility.** All motion respects `prefers-reduced-motion`. Colour contrast meets WCAG AA in both themes. Focus rings are visible.

All values live in `src/theme/tokens.css` as CSS variables. These are mapped into Tailwind through `@theme`, so restyling means editing one file.

---

## 4. Pages & Routes

| Route | Access | Contents |
|---|---|---|
| `/` | Public | Hero with a "Where to?" quick box, how it works (3 steps), popular destinations, sample itinerary, CTA and footer |
| `/explore` | Public | Destination grid with filters (vibe, budget tier, season) and search |
| `/destinations/:slug` | Public | Hero image, best time to visit, highlights, typical daily budget and a "Plan a trip here" button that pre-fills `/plan` |
| `/login`, `/signup` | Guest only | Email and password, plus "Continue with Google" |
| `/t/:shareId` | Public | Read-only shared itinerary with a "Plan your own" CTA |
| `/plan` | User | 5-step wizard: Destination → Dates → Budget and travellers → Interests (StickerPicker) → Pace. Then the review step and Generate. |
| `/trips` | User | My Trips as a grid of ticket cards, with delete |
| `/trips/:id` | User | Boarding-pass header, day-by-day timeline, cost breakdown, tips and packing list. Actions: Download PDF, Share (copy link or Web Share API), Regenerate a single day, Delete. |
| `/passport` | User | Profile with a stamp collection, theme toggle, "x/5 generations left today" and logout |
| `/admin` | Admin | Dashboard with KPI tiles and charts (trips per day, top destinations, AI provider split) |
| `/admin/destinations` | Admin | Table with create, edit and delete forms |
| `/admin/users` | Admin | Table with block and unblock |
| `/admin/itineraries` | Admin | Table with view and remove (moderation) |
| `*` | Public | 404 page ("Lost luggage") |

**Global elements**
- Navbar, which becomes a bottom tab bar on mobile
- Theme toggle
- Toasts
- ServerWakingBanner, shown when any request takes longer than 3s

---

## 5. Data Contracts (shared by the mock API and the future backend)

The base URL is `VITE_API_URL`. If `VITE_USE_MOCKS=true`, MSW intercepts the requests. The JWT is an access token kept in memory plus an httpOnly refresh cookie. In mock mode, both are simulated.

```ts
User        { id, name, email, avatarUrl?, role: 'user'|'admin', createdAt, blocked }
Destination { id, slug, name, country, vibes: Vibe[], budgetTier: 'budget'|'mid'|'luxury',
              bestMonths: number[], summary, highlights: string[], avgDailyCost: {amount, currency},
              image: { url, credit, creditUrl } }
TripRequest { destination, startDate, endDate, budget: {amount, currency},
              travellers: 'solo'|'couple'|'friends'|'family', interests: Interest[], pace: 'chill'|'balanced'|'packed' }
Itinerary   { id, shareId?, request: TripRequest, title, summary, days: Day[],
              estimatedCost: {total, breakdown: {stay, food, transport, activities}, currency},
              tips: string[], packingList: string[], provider: 'gemini'|'groq', createdAt }
Day         { dayNumber, date, theme, activities: Activity[] }
Activity    { time: 'morning'|'afternoon'|'evening', title, description, location?, estCost? }
Quota       { used, limit, resetsAt }
ApiError    { error: { code, message } }   // codes: VALIDATION, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, QUOTA_EXCEEDED, AI_UNAVAILABLE, SERVER
```

**Endpoints**

Auth
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`

Destinations
- `GET /destinations?vibe&budget&month&q`, `GET /destinations/:slug`

Itineraries
- `POST /itineraries/generate` returns `Itinerary` plus `Quota`
- `GET /itineraries`, `GET /itineraries/:id`, `DELETE /itineraries/:id`
- `POST /itineraries/:id/days/:n/regenerate`
- `POST /itineraries/:id/share` returns `{shareId}`
- `GET /share/:shareId`

User
- `GET /me/quota`

Admin
- `GET /admin/stats`
- CRUD on `/admin/destinations`
- `GET /admin/users`, `PATCH /admin/users/:id`
- `GET /admin/itineraries`, `DELETE /admin/itineraries/:id`

The TypeScript types live in `src/lib/api/types.ts`. Zod schemas validate forms and also check API responses in development.

---

## 6. Architecture

| Concern | Tool |
|---|---|
| Build | Vite with React and TypeScript (strict mode, with simple types) |
| Styling | Tailwind CSS v4 with `tokens.css` |
| Motion | Framer Motion (`motion`) |
| Routing | React Router (data router, lazy-loaded route modules) |
| Server state | TanStack Query |
| Client state | React Context for auth and theme only |
| Forms | React Hook Form with Zod |
| Mocks | MSW, with seed data for ~12 destinations and 3 sample itineraries |
| PDF | `@react-pdf/renderer`, lazy-loaded only on "Download PDF" |
| Charts | Recharts (lazy-loaded inside admin only) |
| Icons | lucide-react |
| Images | Unsplash URLs with credit stored in the data; `loading="lazy"` and explicit sizes |

```
frontend/
  src/
    theme/        tokens.css, fonts
    components/
      ui/         Button, Chip, Input, Select, Card, Ticket, Stamp, Modal, Toast, Skeleton
      layout/     Navbar, MobileTabBar, Footer, ServerWakingBanner, ProtectedRoute, AdminRoute
      signature/  StickerPicker, GeneratingScreen, TicketUnfold, PassportStamp
    features/
      auth/       context, hooks, LoginForm, SignupForm, GoogleButton
      explore/    DestinationCard, Filters, hooks
      planner/    wizard steps, schema, hooks
      trips/      ItineraryView, DayTimeline, CostBreakdown, TripCard, pdf/, hooks
      passport/   StampGrid, QuotaMeter
      admin/      StatsCharts, tables, forms, hooks
    pages/        one thin file per route
    lib/          api/ (client, types, endpoints), queryClient, utils
    mocks/        browser.ts, handlers/, data/
    test/         setup, utilities
  e2e/            Playwright specs
```

**Data flow.** Pages compose feature components. Features call hooks such as `useGenerateItinerary`, which wrap TanStack Query. Those hooks call `lib/api/client.ts`, a fetch wrapper that:
- attaches the token
- refreshes the token once when it gets a 401
- turns failures into `ApiError`
- reports slow requests so the waking banner can appear

---

## 7. Error Handling & States

- **Lists and pages:** every list and page has a loading skeleton, an empty state (illustrated, with a CTA) and an error state (a friendly message with Retry).
- **`QUOTA_EXCEEDED`:** shows a modal with the reset time.
- **`AI_UNAVAILABLE`:** shows a "Both AI planners are busy, try again in a minute" message with retry.
- **401:** triggers one silent token refresh. If that fails, the user is logged out and sent to `/login?next=…`.
- **Slow responses:** a request taking longer than 3s shows the ServerWakingBanner. TanStack Query retries network errors twice with backoff.
- **Unexpected crashes:** a route-level error boundary catches them.

---

## 8. Testing

**Unit tests (Vitest with React Testing Library and MSW in Node)**
- the UI primitives
- the planner wizard: validation and step navigation
- auth flows
- the API client: refresh, error mapping and the slow-request signal
- route guards

**End-to-end tests (Playwright, mock mode)**
- Journey: signup → plan → generate → view → download PDF → share → open the share link
- An admin creates a destination
- The quota-exceeded message appears

**Scripts:** `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e` must all pass before each commit milestone.

---

## 9. Out of Scope (this spec)

- **Phase 1b:** backend implementation (the real API, AI integration, caching and quotas)
- **Phase 1b:** forgot-password email (via the Brevo free tier)
- **Later:** booking APIs, AI chatbot, premium memberships
- **Phase 2:** React Native app
