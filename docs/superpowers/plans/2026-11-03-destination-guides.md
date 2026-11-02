# 128 destinations with full guides · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every destination page has a grounded guide (about, history, significance, things to do, food,
sources), and the catalogue grows from 44 to 128 Indian destinations in four batches.

**Spec:** `docs/superpowers/specs/2026-11-03-destination-guides-design.md`.

## Global Constraints
- Comment everything; no AI credit; commit to `main`; push only on the owner's word.
- Guides are written offline once and stored in `backend/src/data/guides.json`; never generated live.
- Every dish and thing-to-do title must appear in the destination's source text (code-checked).
- Sources: Wikivoyage + Wikipedia (CC BY-SA 4.0), credited on every page; User-Agent names TripWise.
- Section limits: about ≤ 900 chars, history ≤ 700, significance ≤ 400, thingsToDo 6–10, food 4–8.

## Review Focus
1. A destination without a Wikivoyage page — falls back to Wikipedia only; still checked; flagged if thin.
2. A model inventing a dish that isn't in the sources — dropped by the check.
3. A guide missing (not written yet) — the page shows what it has, no empty headings.
4. Re-running the importer — existing guides and admin-hidden flags are kept.
5. Destination counts in tests — derived from the catalogue, not hard-coded.

---

### Task 1: Guide rules (pure) — `backend/src/services/guideRules.ts`
`type Guide`, `checkGuide(draft, sourceText): { ok: true; guide } | { ok: false; reasons }` (drops dishes /
things not in the source, enforces counts and lengths, strips phone numbers/prices). Tests first.

### Task 2: Sources and the writer script — `backend/scripts/write-guides.ts`
Fetch Wikivoyage/Wikipedia plain text (MediaWiki API, cached in `backend/.cache/guides/`, git-ignored);
prompt + JSON schema; run through the existing AI chain; `checkGuide`; write `guides.json`; options
`--only slug,slug` and `--missing`. Tests for the prompt/parse with a fake chain (no network).

### Task 3: Serve guides — seed + API + mock
`seedDestinations` adds `guide` to each destination doc; `GET /destinations/:slug` returns it (the list
doesn't); mock attaches from `@catalogue/guides.json`. Tests.

### Task 4: The destination page
Sections About · History · Why it matters · Things to do · Food to try · Sources line; hidden when the
guide is missing. Tests + screenshots 1536/390.

### Task 5: Guides for the 44 current destinations
Run the writer; read a sample per region; commit `guides.json`.

### Tasks 6–9: Batches 1–4 (20, 20, 20, 24 new destinations)
Add to `scripts/catalogue/destinations.ts` (NEW), run `import:catalogue`, add hand-picked spots where
fewer than 6 places, write guides with `--missing`, sample-read, run both suites, commit per batch:
Batch 1 Himalaya (Himachal, Uttarakhand, J&K), Batch 2 North-East, Batch 3 Himalaya/NE remainder +
Ghats & hills, Batch 4 rest of India (forests, coasts, islands, central India).

### Task 10: Docs (README counts, catalogue notes) and wrap-up; ask before pushing.
