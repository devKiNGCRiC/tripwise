# Admin dashboard (design)

**Date:** 2026-11-03 · **Status:** built (2026-11-03) · decided by the builder at the owner's request ("do the best and what you
recommended") · **Roadmap:** the Admin step (dashboard, management tools, end-to-end tests)

## Why
Before launch, someone has to see how TripWise is used, help a traveller who is stuck, stop abuse and keep
the catalogue tidy — without a database console, and without ever reading people's private trips.

## Privacy first (anti-goals)
Admins never see: anyone's trips, journals, Toli chats, money, budgets, locations, Kushal links or Ask
TripWise questions. They see account basics (name, @username, email, joined, plan, blocked, number of
trips), totals and counts, the catalogue, and reports about **public** content (public passports). Every
admin action is written to an audit log (who, what, whom, when) that admins can read.

## What it has
1. **Overview** — travellers (total, new this week), trips planned in the last 7 days (AI / similar-trip
   cache / TripWise's own planner), today's AI use (plans, fresh ideas, Ask TripWise questions), Tolis,
   sign-ups per day for 30 days (simple bars), and the 10 most planned destinations (30 days).
2. **Travellers** — search by name, email or @username (20 a page); block / unblock (a blocked account can't
   log in and its sessions end at once); move between free and premium. Admins can't block themselves or
   other admins.
3. **Destinations** — the catalogue with region, best months, number of places and trips planned (30 days);
   **hide from Explore** (and its page answers "not found") without deleting it; the setting survives
   catalogue re-imports.
4. **Reports (moderation)** — anyone signed in can report a public passport ("spam", "offensive",
   "pretending to be someone", "other" + an optional note); at most 5 reports a day per person and one open
   report per person per passport. Admins see open reports and choose: **dismiss**, **remove content** (clears
   the bio and profile photo and makes the passport friends-only), or **block** the account.
5. **Audit log** — the last 100 admin actions.
6. **End-to-end tests** — Playwright tests that drive the real website in a browser against the demo API:
   a traveller's journey (log in → Quick plan → trip → Ask TripWise) and an admin blocking a traveller. They
   use the Edge already on Windows (`channel: 'msedge'`), so nothing heavy is downloaded; `npm run e2e`.

## Builder's calls
- Admin pages live under `/admin` (already guarded) with tabs: Overview · Travellers · Destinations ·
  Reports · Log.
- Reports cover public passports only for now (the only public content); Toli content stays within Tolis.
- Deleting an account removes reports they made and reports about them.
