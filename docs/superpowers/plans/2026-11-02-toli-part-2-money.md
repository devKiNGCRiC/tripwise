# Toli Part 2 — Money (Lekha) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Toli keeps its money fair, not "equal": group expenses split only among the people who shared
them (equally, by amounts or by shares), private personal expenses, everyone's balance, the fewest payments to
settle up (with a UPI pay link or "mark settled" for cash), totals by category against TripWise's estimate,
and expenses that wait for signal without ever being saved twice — real API and demo mock agreeing.

**Architecture:**
- **Pure money rules** (`backend/src/services/lekhaRules.ts`, no runtime imports, like `toliRules.ts`) do all
  the maths in whole paise: splitting, balances, settle-up, totals, UPI links, rupee parsing. The API and the
  website's mock both import them (new `@lekha-rules` alias), so demo mode adds up exactly like the API.
- **Backend:** collections `ToliExpense` (group and personal, soft-deleted) and `ToliSettlement` (never
  deleted); routes in `routes/lekha.ts`; the member subdoc gains an optional `upi` ID.
- **Frontend:** a new **Lekha** tab on the Toli page (`features/toli/lekha/`), and the Chaupal outbox becomes
  a shared `useOutbox` hook so expenses and settlements wait for signal the same way messages do.

**Tech Stack:** as Part 1 — Express 5, Mongoose 8, Zod 4, Vitest/Supertest/mongodb-memory-server; React 19,
TanStack Query, MSW, Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-toli-design.md` (Part 2 = items 10–14).

## Global Constraints
- Comment everything (file header + before every function/block); no AI credit anywhere; commit to `main`; push only when the owner says so.
- **Money is whole paise (integers), INR only.** No floats anywhere in money maths; rupees are parsed from text (`"12.5"` → 1250). Every split adds up to the expense exactly; all balances add up to 0.
- Errors as Part 1: non-members get **404** for anything about a Toli; acting above your role **403**; state clashes **409 CONFLICT** (`clash()`); bad input **400 VALIDATION**.
- Name: **Lekha** (लेखा, Sanskrit "account") shown as "Lekha · who paid, who owes". Tabs become **Sahyatra · Decide · Lekha · Chaupal · Sahyatris · Activity**.
- Categories: `'stay' | 'food' | 'transport' | 'tickets' | 'shopping' | 'other'`. Methods: `'upi' | 'cash'`.
- Limits: expense 1 paisa – ₹5,00,000 (50,000,000 paise); title 1–80 chars; shares 1–100 each; day 1–30 (optional).
- **Personal expenses are seen only by their owner** — never in balances, totals of others, activity, or any other member's response.
- Anyone in the Toli may add a group expense, choose who paid and who shared, and record a settlement (spec item 12). Deleting a group expense: whoever added it, or leaders. Settlements are never deleted (a mistake is fixed by recording the reverse payment).
- UPI ID: optional, per Toli, shown only to that Toli's members (like the phone number); format `name@bank` (`/^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9]{1,63}$/i`). Pay link: `upi://pay?pa=<id>&pn=<name>&am=<rupees, 2 decimals>&cu=INR&tn=<note>` (all URL-encoded). TripWise never holds or moves money.
- Offline: expenses and settlements carry a `clientId` made on the phone; the same `clientId` again answers with the stored one (unique index `{ toliId, addedBy, clientId }`).
- Polling: the Lekha tab refreshes every 10 s (`TOLI_REFRESH_MS`).
- Demo people keep Hindu names (Raj Roy, Ananya Das).

## Review Focus
1. Amounts that don't divide evenly (₹100 among 3; shares 1:2 of ₹10.01) — the parts add up to the paisa and balances sum to 0. → Task 1.
2. A Sahyatri who still owes or is owed leaving, or being removed — expect 409 "Settle up first", so no debt vanishes. → Task 2.
3. An expense or settlement sent twice after an offline retry (same `clientId`) — expect one. → Tasks 2, 3, 6.
4. Someone's personal expense or personal total appearing in another member's response (expenses list, Lekha summary, activity) — expect never (assert the JSON text). → Tasks 2, 3.
5. Bad splits: a sharer or payer who isn't a member, custom amounts that don't add up, 0 or negative amounts, an empty sharer list — expect 400 and nothing saved. → Task 2.

---

### Task 0: Indian or English names (owner's request, 2026-11-02)
Each person chooses how feature names read: **Indian** (default — the Hindi/Sanskrit word with its plain-English
line, as now) or **English** (plain words everyone understands, older users and Gen Z alike — no slang, no Hindi).
Saved on the account (and on the device for instant start); per person, so one Toli can read both ways.

| key | Indian | English |
|---|---|---|
| toli / tolis | Toli / Tolis | Group / Groups |
| sahyatri / sahyatris | Sahyatri / Sahyatris | Member / Members |
| sahyatra | Sahyatra | Group trip (tab: Trip) |
| sutradhar / sah | Sutradhar / Sah-Sutradhar | Leader / Co-leader |
| sujhav / sujhavs | Sujhav / Sujhavs | Suggestion / Suggestions |
| tithi | Tithi | Dates |
| chaupal | Chaupal | Group chat (tab: Chat) |
| anurodh | Anurodh | Raise hand |
| lekha | Lekha | Money |
| yatraMarks | Yatra marks | Travel badges |

**Files:** Create `frontend/src/features/words/words.ts` (the table as `WORDS: Record<'indian'|'english', Words>` + `type NameStyle`), `frontend/src/features/words/WordsProvider.tsx` (`WordsProvider`, `useWords(): { w: Words; style: NameStyle; english: boolean; setStyle(s): void }` — device key `tripwise:names`; follows the account's `preferences.names` once signed in, like `AccountThemeSync`; `setStyle` saves to the device and, when signed in, to the account), `frontend/src/features/words/NamesToggle.tsx` (a switch "English names", `aria-pressed`); Modify backend `db/models/user.ts`, `routes/profile.ts` (zod `names: z.enum(['indian','english']).optional()`), `db/toPublic.ts`; frontend `lib/api/types.ts` (`Preferences.names?`), `RootLayout.tsx` (provider), `features/account/PreferencesForm.tsx` (a "Feature names" choice), every Toli screen + Navbar + MobileTabBar + TripActions + PlanPage banner + passport Yatra marks (visible text only — identifiers, routes and API values stay); `features/toli/labels.ts` (`ROLE_LABEL`/`TABS` become functions of `Words`). In English mode the Devanagari decorations beside Toli headings are hidden; the footer's "शुभ यात्रा" and destinations' local names stay. Server error messages stay as they are (ledger).
- [ ] **Step 1: Write the failing tests** — `features/words/Words.test.tsx`: default shows "Tolis" in the navbar and "Sahyatris" tab; turning on "English names" on a Toli page shows "Groups" in the navbar, tabs "Trip · Decide · Chat · Members · Activity", "You're the Leader", and the account's `preferences.names` becomes `'english'` in the mock db; a fresh render after that starts in English; the account Preferences form switches it back to Indian. Backend `test/profile.test.ts`: `PATCH /me/profile {preferences:{names:'english'}}` saves; `'hinglish'` → 400.
- [ ] **Step 2–4:** FAIL → implement → PASS; the whole frontend suite stays green (existing tests use the default Indian names), plus backend suite, tsc, eslint.
- [ ] **Step 5: Commit** `feat: Indian or English names — everyone chooses how Toli words read (saved on the account)`.
Later tasks build Lekha with `useWords()` from the start (`w.lekha`).

### Task 1: Pure money rules (shared by API and mock)
**Files:** Create `backend/src/services/lekhaRules.ts`; Test `backend/test/lekhaRules.test.ts`.

**Interfaces — Produces:**
- `type Category = 'stay'|'food'|'transport'|'tickets'|'shopping'|'other'`; `type PayMethod = 'upi'|'cash'`; `CATEGORIES: Category[]`.
- `type Split = { kind: 'equal'; among: string[] } | { kind: 'amounts'; amounts: Record<string, number> } | { kind: 'shares'; shares: Record<string, number> }`.
- `splitExpense(amount: number, split: Split): { ok: true; parts: Record<string, number> } | { ok: false; reason: 'empty' | 'mismatch' | 'bad-share' }` — `equal`: `floor(amount / n)` each, the leftover paise go one each to the first sharers in `among` order; `amounts`: must sum exactly to `amount` (else `mismatch`), zero parts dropped; `shares`: integer weights 1–100 (else `bad-share`), largest-remainder rounding, ties to the earlier key in insertion order. Duplicate ids in `among` count once.
- `balances(expenses: { paidBy: string; parts: Record<string, number> }[], settlements: { from: string; to: string; amount: number }[]): Record<string, number>` — net per person (positive = gets money back): payer `+amount`, each sharer `−part`; settlement `from +amount`, `to −amount`. Zero entries kept for anyone who appears.
- `settleUp(net: Record<string, number>): { from: string; to: string; amount: number }[]` — greedy: repeatedly match the largest debtor with the largest creditor (ties by id), pay `min` of the two; ignores zeros.
- `totals(expenses: { amount: number; category: Category; parts: Record<string, number> }[]): { total: number; byCategory: Record<Category, number>; perPerson: Record<string, number> }` — every category key present (0 when none).
- `toPaise(text: string): number | null` — accepts `"12"`, `"12.5"`, `"12.50"`, `"1,200.75"`; rejects more than 2 decimals, negatives, empty, non-numbers. `formatRupees(paise: number): string` → `"₹1,200.75"`, `"₹640"` (no `.00`), Indian grouping (`"₹1,00,000"`).
- `isUpiId(text: string): boolean`; `upiLink(p: { upi: string; name: string; amount: number; note: string }): string`.

- [ ] **Step 1: Write the failing tests** — `splitExpense`: `10000` equal among `['a','b','c']` → `{a:3334,b:3333,c:3333}`; amounts `{a:600,b:400}` of `1000` ✓, of `1001` → `mismatch`; shares `{a:1,b:2}` of `1001` → `{a:334,b:667}`; share `0` or `1.5` → `bad-share`; `among: []` → `empty`; every `ok` result sums to `amount` (loop over 200 random amounts and 1–7 sharers). `balances`: Raj pays 900 shared by Raj/Ananya/Demo → `{raj:600,ananya:-300,demo:-300}`; after settlement ananya→raj 300 → ananya 0; sum always 0. `settleUp`: `{a:-500,b:-300,c:800}` → two payments `a→c 500`, `b→c 300`; already-settled → `[]`. `totals`: categories all present. `toPaise`: the cases above, `"12.345"` → null, `"-5"` → null, `"abc"` → null. `formatRupees(10000000)` → `"₹1,00,000"`, `formatRupees(64000)` → `"₹640"`, `formatRupees(120075)` → `"₹1,200.75"`. `upiLink({upi:'raj@okicici',name:'Raj Roy',amount:64000,note:'Kerala Toli'})` → `"upi://pay?pa=raj%40okicici&pn=Raj%20Roy&am=640.00&cu=INR&tn=Kerala%20Toli"`. `isUpiId('raj@okicici')` ✓, `'raj'` ✗, `'raj@'` ✗.
- [ ] **Step 2: Run** `npx vitest run test/lekhaRules.test.ts` in `backend` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `lekhaRules.ts` with the signatures above (no imports).
- [ ] **Step 4: Run** the file — Expected: PASS; then `npx vitest run` and `npx tsc --noEmit` — all green.
- [ ] **Step 5: Commit** `feat(backend): Lekha money rules — fair splits to the paisa, balances, fewest payments, UPI links`.

### Task 2: Expenses — group and personal (API)
**Files:** Create `backend/src/db/models/toliExpense.ts`, `backend/src/routes/lekha.ts`; Modify `backend/src/db/models/toli.ts` (member `upi?: string`), `backend/src/db/models/index.ts`, `backend/src/routes/tolis.ts` (`PATCH /tolis/:id/me` accepts `upi` — string sets, `null` clears, invalid → 400; leaving/removing blocked when the member's balance ≠ 0), `backend/src/services/tolis.ts` (`memberCards` adds `upi` when set), `backend/src/app.ts` (mount `lekhaRoutes`); Test `backend/test/lekha.test.ts`.

**Interfaces:**
- Consumes `splitExpense`, `balances` (Task 1); Part 1's `loadMember`, `isLeader`, `logActivity`, `clash`.
- Model `ToliExpense { toliId, addedBy, clientId, personal: boolean, title, amount, category, method, day?: number, paidBy, parts: Map<userId, paise> /* personal: { [owner]: amount } */, deletedAt?: Date, deletedBy?: string, createdAt }`, unique index `{ toliId, addedBy, clientId }`.
- `POST /tolis/:id/expenses` body `{ clientId, title, amount, category, method, day?, personal?: boolean, paidBy?: userId /* default me */, split?: Split /* default equal among all members */ }` → 201 `{ expense: ExpenseView }`; same `clientId` → 200 with the stored one. Personal: `paidBy` and `split` ignored (owner pays, owner's part). Payer and every sharer must be current members (400 "Only Sahyatris of this Toli can share an expense.").
- `GET /tolis/:id/expenses` → `{ expenses: ExpenseView[] }` — this Toli's group expenses plus **my** personal ones, not deleted, newest first.
- `DELETE /tolis/:id/expenses/:eid` → 204 — group: the one who added it or leaders (else 403); personal: owner only (anyone else 404). Soft delete.
- `ExpenseView = { id, title, amount, category, method, day?, personal, paidBy: ToliPerson, shares: { person: ToliPerson; amount: number }[], addedBy: ToliPerson, canDelete: boolean, createdAt }`.
- Export `memberBalance(toliId: string, userId: string): Promise<number>` from `routes/lekha.ts`'s service half (put it in `backend/src/services/lekha.ts`) for the leave check and Task 3.
- Activity: `expense-added { expenseId, title, amount }`, `expense-deleted { title, amount }` — **group only**.

- [ ] **Step 1: Write the failing tests** (`lekha.test.ts`, in-memory Mongo, three members Demo/Rohan/Priya like Part 1's tests): add a group expense paid by Rohan for ₹900 shared by Rohan and Priya only → `shares` are 450/450 and Demo isn't in them; default split = all members; `amounts` not adding up → 400 and nothing saved; a sharer who isn't a member → 400; amount `0` and `50000001` → 400; same `clientId` twice → one expense (200 the second time); a personal expense is in its owner's list and **absent from the others' (assert the response text doesn't contain its title)** and from `/activity`; Priya can't delete Rohan's group expense (403), the Sutradhar can (204) and it leaves the list; deleting someone's personal expense → 404; `PATCH /me {upi:'priya@oksbi'}` shows `upi` on Priya's member card, `{upi:'nope'}` → 400; Priya, who owes ₹450, leaving → 409, and the Sutradhar removing her → 409; non-member list/add → 404.
- [ ] **Step 2: Run** `npx vitest run test/lekha.test.ts` — Expected: FAIL (route missing → 404s).
- [ ] **Step 3: Implement** the model, `services/lekha.ts` (`expenseView`, `memberBalance`), routes and the `/me` + leave changes.
- [ ] **Step 4: Run** the file, then the whole backend suite and `npx tsc --noEmit` — all green.
- [ ] **Step 5: Commit** `feat(backend): Toli expenses — shared only by those who shared, personal ones private, offline-safe, no leaving with money owed`.

### Task 3: Balances, settle up and totals (API)
**Files:** Create `backend/src/db/models/toliSettlement.ts`; Modify `backend/src/services/lekha.ts`, `backend/src/routes/lekha.ts`; Test `backend/test/lekhaSummary.test.ts`.

**Interfaces:**
- Consumes `balances`, `settleUp`, `totals`, `upiLink` (Task 1); `memberBalance`, `expenseView` (Task 2).
- Model `ToliSettlement { toliId, from, to, amount, method, recordedBy, clientId, createdAt }`, unique `{ toliId, recordedBy, clientId }`. No delete route.
- `POST /tolis/:id/settlements { clientId, from, to, amount, method }` → 201 `{ settlement: SettlementView }` (retry → 200); `from ≠ to`, both current members, amount in limits, else 400. Activity `settled { from, to, amount }`.
- `GET /tolis/:id/lekha` → `{ lekha: LekhaSummary }`:
  `LekhaSummary = { balances: { person: ToliPerson; net: number }[] /* members only, largest owed first */; settleUp: { from: ToliPerson; to: ToliPerson; amount: number; upiLink?: string /* when the payee saved a UPI ID; note "<Toli name> · TripWise" */ }[]; totals: { total: number; byCategory: Record<Category, number>; perPerson: { person: ToliPerson; share: number }[]; mine: { share: number; personal: number; total: number }; estimate: number | null /* the Sahyatra's estimatedCost.total, null without one */ }; settlements: SettlementView[] /* newest first */ }`.
  `SettlementView = { id, from: ToliPerson, to: ToliPerson, amount, method, recordedBy: ToliPerson, createdAt }`.
  `totals.total/byCategory/perPerson` count **group** expenses only; `mine.personal` is only ever the viewer's own.

- [ ] **Step 1: Write the failing tests:** after Rohan pays ₹900 for Rohan+Priya and Priya pays ₹300 for all three, balances are Rohan +₹350 (35000), Priya −₹250 (−25000), Demo −₹100 (−10000), summing to 0, and `settleUp` is Priya→Rohan ₹250 and Demo→Rohan ₹100; with Rohan's UPI saved, his incoming payments carry `upiLink` starting `upi://pay?pa=`; recording Priya→Rohan for her full amount drops her from `settleUp` and keeps the settlement in `settlements`; same `clientId` twice → one settlement; `from === to` → 400; a non-member `to` → 400; Demo's `mine.personal` includes Demo's personal ₹200 while Priya's summary text contains neither `20000` from it nor its title; `estimate` equals the linked Sahyatra's `estimatedCost.total`, `null` for a Toli without a trip; non-member → 404.
- [ ] **Step 2–4:** FAIL → implement → PASS (file + backend suite + tsc).
- [ ] **Step 5: Commit** `feat(backend): Lekha summary — balances, fewest payments with UPI pay links, settlements kept forever, totals against the estimate`.

### Task 4: Website API layer and demo mock
**Files:** Modify `frontend/vite.config.ts` + `frontend/tsconfig.json` (`@lekha-rules` → `../backend/src/services/lekhaRules.ts`), `frontend/src/lib/api/types.ts` (`Category`, `PayMethod`, `Split` re-exported from `@lekha-rules`; `ToliExpense`, `NewExpense`, `Settlement`, `NewSettlement`, `LekhaSummary`; `ToliMember.upi?`, `Toli.me.upi?`), `frontend/src/lib/api/endpoints.ts` (`toliApi.expenses`, `addExpense`, `deleteExpense`, `lekha`, `settle`; `setPhone` → `setMe(id, { phone?, upi? })` keeping callers working), `frontend/src/mocks/handlers/tolis.ts` (or a new `mocks/handlers/lekha.ts` registered in `handlers/index.ts`), `frontend/src/mocks/data/tolis.ts`, `frontend/src/mocks/db.ts`; Test `frontend/src/lib/api/lekha.test.ts`.

**Interfaces:** the mock uses `@lekha-rules` for every calculation (no re-implementation) and returns Task 2–3 shapes and codes. Seed for "Kerala Toli": Raj saved UPI `king@okicici`; expenses — Raj paid ₹3,600 "Houseboat deposit" (stay, UPI, day 1) shared by all three; Demo paid ₹840 "Karimeen lunch" (food, cash, day 1) shared by Demo and Ananya only; Ananya paid ₹450 "Auto to the jetty" (transport, cash) shared equally; one personal expense of Demo's ₹250 "Banana chips" (shopping). That leaves Raj +₹2,250, Demo −₹930, Ananya −₹1,320, so settle-up is Ananya→Raj ₹1,320 and Demo→Raj ₹930.

- [ ] **Step 1: Write the failing tests** (through `toliApi` against the mock): the seeded summary's balances sum to 0 and match `balances()` of the seed; Ananya's view (`session.set('u_ananya')`) doesn't contain "Banana chips"; add an expense with `amounts` that don't add up → `VALIDATION`; same `clientId` twice → one; Demo settling to Raj gets `upiLink` in `settleUp` beforehand and the payment drops out after; a member with a non-zero balance leaving → `CONFLICT`.
- [ ] **Step 2–4:** FAIL → implement → PASS (`npx vitest run src/lib/api/lekha.test.ts`), then the whole frontend suite.
- [ ] **Step 5: Commit** `feat(frontend): Lekha API client and demo mock (same money rules as the API)`.

### Task 5: Shared outbox (Chaupal refactor)
**Files:** Create `frontend/src/features/toli/useOutbox.ts`; Modify `frontend/src/features/toli/ChaupalTab.tsx` to use it; Test: the existing `Chaupal.test.tsx` (offline, and "only from the account that wrote it") must stay green unchanged.

**Interfaces — Produces:** `useOutbox<T extends { clientId: string }>(name: string, toliId: string, send: (item: T) => Promise<unknown>, onSent: () => void): { queue: T[]; add: (item: T) => void; error: string; clearError: () => void }` — key `tripwise:toli-${name}:${userId}:${toliId}` (Chaupal keeps `name = 'outbox'` so already-waiting messages survive the upgrade); retries on `online` and on mount; drops an item and sets `error` on any non-`NETWORK` failure; never sends one item twice at once. `newClientId()` exported from the same file.

- [ ] **Step 1:** Run `npx vitest run src/features/toli/Chaupal.test.tsx` — Expected: PASS (baseline, 9 tests).
- [ ] **Step 2:** Extract the hook; ChaupalTab keeps its behaviour.
- [ ] **Step 3:** Re-run — Expected: PASS, 9 tests; `tsc` + eslint clean.
- [ ] **Step 4: Commit** `refactor(frontend): one outbox for anything written without signal (Chaupal first)`.

### Task 6: The Lekha tab — adding and listing expenses
**Files:** Create `frontend/src/features/toli/lekha/LekhaTab.tsx` (layout: summary on top, then the add form, then expenses), `lekha/AddExpense.tsx` (what for, amount in ₹, category, UPI/cash, day of the Sahyatra if any, who paid — defaults to me —, who shared — checkboxes, all ticked —, split Equally / By amounts / By shares, and "Only for me (personal)" which hides payer and sharers), `lekha/ExpenseList.tsx` (each: title, amount, who paid, "shared by Raj and Ananya" or "personal · only you see this", day, delete when `canDelete`, waiting items "⏳ Waiting for signal"); Modify `frontend/src/features/toli/labels.ts` (`TABS` adds `{ key: 'lekha', label: 'Lekha' }` after Decide), `frontend/src/pages/ToliPage.tsx` (`TabContent`); Test `frontend/src/features/toli/lekha/Lekha.test.tsx`.

**Interfaces:** Consumes Task 4's `toliApi`, Task 5's `useOutbox` (`name = 'expenses'`), `toPaise`/`formatRupees`/`splitExpense` from `@lekha-rules` (the form shows "₹280 each" live and "₹10 left to assign" for amounts, and disables Add until the split is valid).

- [ ] **Step 1: Write the failing tests:** the tab heading "Lekha" with the line "who paid, who owes"; add "Thali dinner" ₹600 paid by me, untick Ananya → the list shows "Thali dinner", "₹600" and "shared by you and Raj Roy"; switching to By amounts with ₹400 + ₹100 shows "₹100 left to assign" and Add is disabled; a personal expense shows "only you see this" and isn't in Ananya's view (re-render as `u_ananya`); offline (`HttpResponse.error()`) → "Waiting for signal", back `online` → saved once; Ananya can't delete Demo's expense (no button), Demo can.
- [ ] **Step 2–4:** FAIL → implement → PASS (file + suite + tsc + eslint).
- [ ] **Step 5: Commit** `feat(frontend): Lekha — add group and personal expenses, split by who shared, offline-safe`.

### Task 7: Balances, settle up and totals on the Lekha tab
**Files:** Create `lekha/Balances.tsx` (each Sahyatri: "gets back ₹550" / "owes ₹250" / "settled"; then "To settle up" — "Ananya Das pays Raj Roy ₹250" with **Pay with UPI** (`<a href={upiLink}>`, shown to the payer only, when there is a link) and **Mark settled** (records via the outbox, `name = 'settlements'`, method `upi` after Pay, else `cash`)), `lekha/Totals.tsx` (trip total, by category as a simple bar list, per person, "Your trip so far: ₹X shared + ₹Y personal (only you see this)", and "TripWise estimated ₹Z" when `estimate` is set), `lekha/SettlementList.tsx`; Modify `frontend/src/features/toli/SahyatrisTab.tsx` (my UPI ID beside my phone: "Your UPI ID (only this Toli sees it)", save / remove); Test `frontend/src/features/toli/lekha/Settle.test.tsx`.

- [ ] **Step 1: Write the failing tests** (seeded Kerala Toli): balances list shows each of the three with the right text (computed from the seed via `@lekha-rules` in the test, not hard-coded twice); Demo sees "Pay with UPI" on "You pay Raj Roy ₹930" whose `href` starts `upi://pay?pa=king%40okicici&pn=Raj%20Roy&am=930.00`; on Ananya's payment Demo sees "Mark settled" but no Pay button (only the payer gets it); marking a payment settled removes it from "To settle up" and adds it to the settlements list; totals show the trip total and "only you see this" with Demo's personal ₹250, and Ananya's view has no "₹250 personal"; saving a UPI ID on the Sahyatris tab makes "Pay with UPI" appear for payments to that person; `nope` shows "That doesn't look like a UPI ID".
- [ ] **Step 2–4:** FAIL → implement → PASS (file + suite + tsc + eslint) + browser screenshots at 1536 and 390 (show them to the owner).
- [ ] **Step 5: Commit** `feat(frontend): Lekha — balances, fewest payments with Pay with UPI or mark settled, totals against TripWise's estimate`.

### Task 8: Docs and wrap-up
**Files:** Modify `README.md` (features row for Lekha moves from 📅 Next to ✅ Done; roadmap), `backend/README.md` (expense, settlement and Lekha endpoints), spec (Names table gains Lekha; status "Part 2 built").
- [ ] **Step 1:** Update docs; run both full suites, `tsc` and eslint — all green.
- [ ] **Step 2:** Final whole-branch review (per the execution skill), fix Critical/Important findings with tests.
- [ ] **Step 3: Commit** `docs: Toli part 2 — Lekha`; ask the owner before pushing.

### Not in Part 2 (on purpose)
Editing an expense (delete and add again for now), expense cards in Chaupal, other currencies, receipts/photos
on expenses, and reminders to pay — later if the owner wants them. Part 3 (on the trip) follows.
