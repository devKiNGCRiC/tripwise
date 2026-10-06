# TripWise Frontend — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable TripWise web app shell. It has the "Passport Pop" theme, UI building blocks, an API client, a mock backend, working login and signup, route guards and a landing page that shows destinations from the mock API.

**Architecture:** The app is a Vite + React + TypeScript SPA:
- **Styling:** every colour and shadow is a CSS variable in `src/theme/tokens.css`, mapped into Tailwind v4.
- **Data:** all server calls go through one fetch wrapper (`src/lib/api/client.ts`). It handles tokens, refresh, errors and slow-server detection.
- **Mock backend:** MSW intercepts those calls in dev and tests, so the app runs without a backend.
- **Server state:** TanStack Query.
- **Auth:** a small React context.
- **Routing:** a React Router data router with lazy-loaded pages.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS 4, React Router 8, TanStack Query 5, React Hook Form 7 + Zod 4, MSW 3, Motion 14, lucide-react, Vitest 5 + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-02-tripwise-frontend-design.md`

**Plan series:** This is Plan 1 of 3. Plan 2 adds Explore, the planner, trips, PDF, share and the full Passport page, plus the `Modal` primitive (first needed there, for the quota-exceeded dialog). Plan 3 adds Admin, Playwright E2E and Lighthouse checks.

## Global Constraints

- **Zero cost:** only free, open-source npm packages. No paid services and no API keys in this plan.
- **Comments everywhere:**
  - Every file starts with a header comment saying what the file is and why it exists.
  - Every component, hook, function, constant group and meaningful block gets a comment explaining *why*.
  - Where the format allows comments, config files get them too. `package.json` and `vercel.json` cannot.
- **No tool attribution:** never add "Co-Authored-By" or "Generated with" lines, or any assistant-tool mention, in commits, code or docs.
- **Commits:** use plain conventional messages (`feat:`, `test:`, `chore:`, `docs:`), signed by the repo's configured user only.
- **TypeScript:** pin `typescript@~6.0`, because typescript-eslint 8.x supports only `<6.1`. Strict mode on, with simple types and no clever generics.
- **Node:** version 22 or newer (MSW 3 and React Router 8 require it). This machine has v24.
- **Imports:**
  - React Router imports come from `react-router`; `RouterProvider` comes from `react-router/dom`.
  - MSW handlers import `http` and `HttpResponse` from `msw/http`.
  - `setupWorker` comes from `msw/browser` and `setupServer` from `msw/node`.
  - Motion imports come from `motion/react`.
- **Unknown API surface:** if a library API or icon name used here fails typecheck because of a newer version, check the package's own docs or types (`node_modules/<pkg>/package.json` exports, lucide.dev for icons). Make the smallest fix and note it in the commit message.
- **Colour tokens:** never hard-code colours in components. Use token utilities (`bg-paper`, `text-ink`, `border-line`, `bg-coral`, `text-danger`, `shadow-pop`…).
- **Error text:** always use `text-danger`, never `text-coral`, because coral fails WCAG AA contrast as text on paper.
- **Motion:** must respect `prefers-reduced-motion`. Use `<MotionConfig reducedMotion="user">` plus the CSS fallback in `index.css`.
- **Working directory:** all commands run from `frontend/` unless stated otherwise.

## Review Focus

1. **Open redirect via `?next=`:** `/login?next=//evil.com` or `next=https://evil.com` must land on `/passport`, never off-site. This is tested in Task 8 (`safeNext.test.ts`).
2. **Expired access token with parallel requests:** two calls that both get 401 must trigger exactly **one** refresh, then both retry and succeed. If the refresh fails, the user is logged out. This is tested in Task 5.
3. **Render cold start:** a request slower than 3s shows the "waking up" banner, and it disappears when the request finishes. This is tested in Task 5 (signal) and Task 9 (banner).
4. **Non-JSON error bodies:** an HTML 502 page from a proxy must become a friendly `SERVER` error, not a JSON parse crash. This is tested in Task 5.
5. **Blocked storage:** if `localStorage` throws (Safari private mode or blocked cookies), the app must still render, with theme and session degrading gracefully. This is tested in Task 2.

---

### Task 1: Scaffold the Vite + React + TypeScript project with tooling

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/eslint.config.js`, `frontend/index.html`, `frontend/.env.example`, `frontend/public/favicon.svg`
- Create: `frontend/src/vite-env.d.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/test/setup.ts`
- Test: `frontend/src/App.test.tsx`
- Delete: the empty folders `frontend/src/routes` and `frontend/src/assets`. They are unused, because routes live in `src/router.tsx`.

**Interfaces:**
- Consumes: nothing.
- Produces:
  - scripts `npm run dev | build | lint | typecheck | test`
  - path alias `@/` → `src/`
  - Vitest with jsdom and the setup file `src/test/setup.ts`
  - env vars `VITE_API_URL` and `VITE_USE_MOCKS`

- [ ] **Step 1: Remove empty placeholder folders**

```bash
cd frontend
rm -rf src/routes src/assets
```

- [ ] **Step 2: Create `frontend/package.json`**

```json
{
  "name": "tripwise-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install react react-dom react-router @tanstack/react-query react-hook-form zod @hookform/resolvers motion lucide-react @fontsource-variable/bricolage-grotesque @fontsource-variable/inter @fontsource-variable/jetbrains-mono
npm install -D vite @vitejs/plugin-react typescript@~6.0 @types/react @types/react-dom @types/node tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event msw eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals
```

Expected: both commands finish without `ERESOLVE` errors.

- [ ] **Step 4: Create `frontend/tsconfig.json`**

```jsonc
// tsconfig.json — TypeScript settings for the whole frontend.
// We only type-check here (noEmit); Vite does the actual compiling.
{
  "compilerOptions": {
    // Modern JS output — every browser we support understands ES2022.
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    // "bundler" matches how Vite resolves imports (package.json "exports", no file extensions).
    "moduleResolution": "bundler",
    // Use React 17+'s automatic JSX runtime: no `import React` needed in every file.
    "jsx": "react-jsx",

    // Safety nets: strict typing + flag unused code so mistakes surface early.
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    // Vite compiles each file on its own, so TS must not rely on cross-file emit tricks.
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true,

    // Global type packages: Vite's import.meta.env + Node (only used by vite.config.ts).
    "types": ["vite/client", "node"],

    // `@/lib/api/client` instead of `../../../lib/api/client`. Mirrored in vite.config.ts.
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 5: Create `frontend/vite.config.ts`**

```ts
/**
 * vite.config.ts — build + dev-server + test-runner configuration.
 *
 * Vite serves the app in development and bundles it for production.
 * Vitest (our unit-test runner) reads the `test` section of this same file,
 * so the app and its tests share one set of plugins and path aliases.
 */
/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // React (JSX + fast refresh) and Tailwind CSS v4 (utility classes) plugins.
  plugins: [react(), tailwindcss()],

  // `@/` points at `src/` — must match "paths" in tsconfig.json.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  // Unit tests run in jsdom (a fake browser) with shared setup (matchers, mock API).
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 6: Create `frontend/eslint.config.js`**

```js
/**
 * eslint.config.js — code-quality rules (run with `npm run lint`).
 *
 * Uses ESLint's "flat config": a list of rule sets applied in order.
 * We lint only our TypeScript source; generated files are ignored.
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Build output and MSW's generated service worker are not our code.
  globalIgnores(['dist', 'coverage', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    // Start from the recommended JS + TypeScript rule sets.
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      // Hooks must be called in the same order every render — breaking this causes real bugs.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Allow intentionally-unused names that start with "_" and rest-sibling omissions.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
]);
```

- [ ] **Step 7: Create `frontend/index.html`**

```html
<!doctype html>
<!--
  index.html — the single HTML page of the TripWise SPA.
  React renders everything inside <div id="root">; this file only holds
  meta tags, the favicon, and a tiny pre-paint theme script.
-->
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta
      name="description"
      content="TripWise plans your whole trip with AI — day-by-day itineraries that fit your budget and your vibe. Free."
    />
    <meta name="theme-color" content="#FFF8EE" />
    <title>TripWise — AI travel itineraries</title>
    <!--
      Set the theme BEFORE the first paint so dark-mode users never see a white flash.
      Must stay in sync with ThemeProvider (storage key "tw_theme").
      Wrapped in try/catch because localStorage can be blocked (private mode).
    -->
    <script>
      (function () {
        try {
          var saved = localStorage.getItem('tw_theme');
          var theme =
            saved === 'light' || saved === 'dark'
              ? saved
              : matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
          document.documentElement.dataset.theme = theme;
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `frontend/public/favicon.svg`**

```svg
<!-- favicon.svg — TripWise tab icon: a coral "stamp" square with a paper-plane mark. -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="4" y="4" width="52" height="52" rx="14" fill="#1B1B1F"/>
  <rect x="0" y="0" width="52" height="52" rx="14" fill="#FF6B5A" stroke="#1B1B1F" stroke-width="4"/>
  <path d="M12 26 L42 13 L33 41 L27 30 Z" fill="#FFF8EE" stroke="#1B1B1F" stroke-width="3" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 9: Create `frontend/.env.example`**

```bash
# .env.example — copy to .env.local and adjust. Vite only exposes vars prefixed VITE_.
# Base URL of the TripWise API. "/api" works for local dev; on Vercel point it at Render.
VITE_API_URL=/api
# "true" = use the in-browser mock backend (MSW). Set "false" once the real backend is live.
VITE_USE_MOCKS=true
```

Then run: `cp .env.example .env.local`. That file is git-ignored by the root `.gitignore` rule `.env.*`.

- [ ] **Step 10: Create `frontend/src/vite-env.d.ts`**

```ts
/**
 * vite-env.d.ts — teaches TypeScript which VITE_* environment variables exist,
 * so `import.meta.env.VITE_API_URL` is typed instead of `any`.
 */
interface ImportMetaEnv {
  /** Base URL of the TripWise API (e.g. "/api" or "https://tripwise-api.onrender.com/api"). */
  readonly VITE_API_URL?: string;
  /** "true" turns on the MSW mock backend. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 11: Create minimal `frontend/src/index.css`, `src/App.tsx` and `src/main.tsx`**

`src/index.css`:
```css
/* index.css — global stylesheet. For now it only loads Tailwind; Task 2 adds the theme. */
@import "tailwindcss";
```

`src/App.tsx`:
```tsx
/**
 * App.tsx — root React component.
 * Temporary placeholder; Task 9 replaces it with providers + the router.
 */
export default function App() {
  return <h1 className="p-8 text-4xl font-bold">TripWise</h1>;
}
```

`src/main.tsx`:
```tsx
/**
 * main.tsx — browser entry point. Mounts <App /> into #root.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode double-invokes some logic in development to surface side-effect bugs early.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 12: Create `frontend/src/test/setup.ts`**

```ts
/**
 * setup.ts — runs before every test file.
 * Adds DOM matchers (toBeInTheDocument, …) and unmounts components after each test
 * so tests never leak into each other.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 13: Write the smoke test `frontend/src/App.test.tsx`**

```tsx
/**
 * App.test.tsx — smoke test proving the toolchain (Vite + TS + Vitest + jsdom) works.
 * Removed in Task 9 when App becomes the real router shell.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the brand name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'TripWise' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 14: Run all checks**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected:
- 1 test passes.
- typecheck and lint print no errors.
- the build creates `dist/`.

- [ ] **Step 15: Commit**

```bash
cd ..
git add frontend
git commit -m "chore(frontend): scaffold Vite + React + TypeScript with Tailwind, Vitest and ESLint"
```

---

### Task 2: "Passport Pop" design tokens, global styles and theme switching

**Files:**
- Create: `frontend/src/theme/tokens.css`, `frontend/src/theme/ThemeProvider.tsx`, `frontend/src/theme/ThemeToggle.tsx`
- Modify: `frontend/src/index.css` (full replacement), `frontend/src/main.tsx` (font imports), `frontend/src/test/setup.ts` (add a `matchMedia` stub)
- Test: `frontend/src/theme/ThemeProvider.test.tsx`

**Interfaces:**
- Consumes: Task 1 tooling.
- Produces:
  - `ThemeProvider` and `useTheme(): { theme: 'light' | 'dark'; setTheme(t); toggleTheme() }`
  - `THEME_STORAGE_KEY = 'tw_theme'`
  - `<ThemeToggle />`
  - Tailwind utilities:
    - colours: `bg-/text-/border-` with `paper`, `paper-2`, `surface`, `ink`, `ink-soft`, `line`, `coral`, `mustard`, `teal`, `sky`, `violet`, `danger`, `on-accent`
    - fonts: `font-display`, `font-body`, `font-mono`
    - shape: `rounded-card`
    - shadows: `shadow-pop`, `shadow-pop-sm`, `shadow-pop-lg`, `shadow-glow`, `drop-shadow-pop`
    - custom: `pop-press`, `aurora-fill`, `ticket-notch`

- [ ] **Step 1: Write the failing test `frontend/src/theme/ThemeProvider.test.tsx`**

```tsx
/**
 * ThemeProvider.test.tsx — verifies theme choice, persistence, toggling,
 * and that blocked localStorage never crashes the app (Review Focus #5).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to the light theme when nothing is saved and the OS is light', () => {
    renderToggle();
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: /night flight/i })).toBeInTheDocument();
  });

  it('restores a saved dark theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderToggle();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles and remembers the choice', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /night flight/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: /day theme/i })).toBeInTheDocument();
  });

  it('still works when localStorage throws (private mode)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: /night flight/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
```

- [ ] **Step 2: Add a `matchMedia` stub to `frontend/src/test/setup.ts`, then run the test and confirm it fails**

jsdom does not implement `matchMedia`, so add this to the end of `setup.ts`:

```ts
/**
 * jsdom has no window.matchMedia. Components ask it about the OS colour scheme
 * and reduced-motion preference, so we stub it to "no preference" (matches: false).
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});
```

Run: `npx vitest run src/theme`
Expected: FAIL. The error is "Failed to resolve import ./ThemeProvider".

- [ ] **Step 3: Create `frontend/src/theme/tokens.css`**

```css
/**
 * tokens.css — THE single source of truth for TripWise's look ("Passport Pop").
 *
 * Every colour, shadow, radius and font used anywhere in the app comes from here.
 * Want a new palette or softer shadows later? Edit this file only — Tailwind
 * utilities (bg-paper, shadow-pop, …) are mapped to these variables in index.css.
 *
 * Style rule of thumb:
 *   paper + stamps → content   |   thick outlines + hard shadows → tappable things
 *   aurora glow → AI moments and the "Night Flight" dark theme
 */

/* ── Day theme (default) ─────────────────────────────────────────────── */
:root {
  /* Surfaces: warm postcard paper, slightly darker paper, white card faces */
  --trip-paper: #fff8ee;
  --trip-paper-2: #fcebd2;
  --trip-surface: #ffffff;

  /* Text and outlines: near-black "ink" */
  --trip-ink: #1b1b1f;
  --trip-ink-soft: #55535c;
  --trip-line: #1b1b1f;

  /* Accent palette: sunset coral, mustard, deep teal, sky, aurora violet */
  --trip-coral: #ff6b5a;
  --trip-mustard: #f4b942;
  --trip-teal: #0f766e;
  --trip-sky: #7cc6fe;
  --trip-violet: #8b5cf6;
  /* Error text colour — darker than coral so it passes WCAG AA on paper */
  --trip-danger: #b42318;
  /* Text colour that sits ON coral/mustard fills */
  --trip-on-accent: #1b1b1f;

  /* Shape */
  --trip-radius-card: 1.25rem;

  /* Neo-brutalist hard shadows (no blur) + the AI glow */
  --trip-shadow-pop-sm: 2px 2px 0 0 var(--trip-line);
  --trip-shadow-pop: 4px 4px 0 0 var(--trip-line);
  --trip-shadow-pop-lg: 7px 7px 0 0 var(--trip-line);
  --trip-shadow-glow: 0 12px 40px -12px rgb(139 92 246 / 0.6);

  /* Aurora gradient used on AI buttons and the generating screen */
  --trip-aurora: linear-gradient(120deg, #0f766e 0%, #8b5cf6 50%, #ff6b5a 100%);

  /* Fonts (self-hosted via Fontsource, imported in main.tsx) */
  --trip-font-display: 'Bricolage Grotesque Variable', ui-sans-serif, system-ui, sans-serif;
  --trip-font-body: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  --trip-font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;

  /* Page background layers: an optional glow layer + subtle paper grain (inline SVG noise, no request) */
  --trip-backdrop: none;
  --trip-grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");

  /* Tell the browser to draw native controls (scrollbars, date pickers) in light style */
  color-scheme: light;
}

/* ── Night Flight theme (dark) ───────────────────────────────────────── */
[data-theme='dark'] {
  --trip-paper: #0b1026;
  --trip-paper-2: #131b3d;
  --trip-surface: #151d40;

  --trip-ink: #f5f1e8;
  --trip-ink-soft: #b8b5c8;
  --trip-line: #f5f1e8;

  /* Accents brightened so they glow against navy */
  --trip-coral: #ff7a6b;
  --trip-mustard: #f7c55e;
  --trip-teal: #2dd4bf;
  --trip-sky: #93d2ff;
  --trip-violet: #a78bfa;
  --trip-danger: #ff8a80;
  --trip-on-accent: #0b1026;

  /* Softer cream shadows + a teal glow */
  --trip-shadow-pop-sm: 2px 2px 0 0 rgb(245 241 232 / 0.85);
  --trip-shadow-pop: 4px 4px 0 0 rgb(245 241 232 / 0.85);
  --trip-shadow-pop-lg: 7px 7px 0 0 rgb(245 241 232 / 0.85);
  --trip-shadow-glow: 0 0 36px -6px rgb(45 212 191 / 0.5);

  /* Aurora light blooms behind the whole page */
  --trip-backdrop:
    radial-gradient(60rem 30rem at 10% -10%, rgb(45 212 191 / 0.16), transparent 60%),
    radial-gradient(50rem 30rem at 100% 0%, rgb(167 139 250 / 0.18), transparent 60%),
    radial-gradient(40rem 30rem at 50% 110%, rgb(255 122 107 / 0.12), transparent 60%);

  color-scheme: dark;
}
```

- [ ] **Step 4: Replace `frontend/src/index.css`**

```css
/**
 * index.css — global stylesheet.
 *
 * 1. Loads Tailwind CSS and our design tokens.
 * 2. Maps tokens to Tailwind utilities (so `bg-paper` = var(--trip-paper)).
 * 3. Sets base page styles (background, fonts).
 * 4. Defines a few custom "Passport Pop" utilities (press effect, aurora, ticket notches).
 * 5. Honours reduced-motion for everyone who asks for it.
 */
@import 'tailwindcss';
@import './theme/tokens.css';

/* Make Tailwind's `dark:` variant follow our data-theme attribute instead of the OS setting. */
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

/*
 * Token → utility mapping. `inline` makes Tailwind emit var(--trip-…) references,
 * so switching data-theme instantly restyles everything without rebuilding CSS.
 */
@theme inline {
  --color-paper: var(--trip-paper);
  --color-paper-2: var(--trip-paper-2);
  --color-surface: var(--trip-surface);
  --color-ink: var(--trip-ink);
  --color-ink-soft: var(--trip-ink-soft);
  --color-line: var(--trip-line);
  --color-coral: var(--trip-coral);
  --color-mustard: var(--trip-mustard);
  --color-teal: var(--trip-teal);
  --color-sky: var(--trip-sky);
  --color-violet: var(--trip-violet);
  --color-danger: var(--trip-danger);
  --color-on-accent: var(--trip-on-accent);

  --font-display: var(--trip-font-display);
  --font-body: var(--trip-font-body);
  --font-mono: var(--trip-font-mono);

  --radius-card: var(--trip-radius-card);

  --shadow-pop-sm: var(--trip-shadow-pop-sm);
  --shadow-pop: var(--trip-shadow-pop);
  --shadow-pop-lg: var(--trip-shadow-pop-lg);
  --shadow-glow: var(--trip-shadow-glow);
  /* drop-shadow follows masked shapes (used by ticket notches, where box-shadow would be clipped) */
  --drop-shadow-pop: 4px 4px 0 var(--trip-line);
}

/* Base page look: paper background with grain (+ aurora blooms at night), body font, display headings. */
@layer base {
  html {
    font-family: var(--trip-font-body);
    -webkit-tap-highlight-color: transparent;
  }
  body {
    min-height: 100dvh;
    background-color: var(--trip-paper);
    background-image: var(--trip-backdrop), var(--trip-grain);
    background-attachment: fixed;
    color: var(--trip-ink);
    -webkit-font-smoothing: antialiased;
  }
  h1,
  h2,
  h3,
  h4 {
    font-family: var(--trip-font-display);
    letter-spacing: -0.02em;
  }
  ::selection {
    background: var(--trip-mustard);
    color: #1b1b1f;
  }
}

/* Neo-brutalist press: lifts on hover, then "slams" into its own shadow on press. */
@utility pop-press {
  transition:
    transform 120ms ease,
    box-shadow 120ms ease;
  &:hover {
    transform: translate(-2px, -2px);
    box-shadow: var(--trip-shadow-pop-lg);
  }
  &:active {
    transform: translate(4px, 4px);
    box-shadow: none;
  }
}

/* Slowly shifting aurora gradient — reserved for AI actions and AI moments. */
@utility aurora-fill {
  background-image: var(--trip-aurora);
  background-size: 200% 200%;
  animation: aurora-shift 8s ease infinite;
}

/*
 * Boarding-pass notches: cuts a half-circle out of the left and right edges,
 * 72px above the bottom (where the ticket "stub" starts). Uses a CSS mask, so
 * wrap the element in `drop-shadow-pop` (not shadow-pop) to keep its shadow.
 */
@utility ticket-notch {
  --notch-y: calc(100% - 72px);
  mask:
    radial-gradient(circle 14px at 0 var(--notch-y), transparent 13px, #000 14px) left / 51% 100% no-repeat,
    radial-gradient(circle 14px at 100% var(--notch-y), transparent 13px, #000 14px) right / 51% 100%
      no-repeat;
}

@keyframes aurora-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Respect users who ask the OS for less motion: effectively disable CSS animations/transitions. */
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Create `frontend/src/theme/ThemeProvider.tsx`**

```tsx
/**
 * ThemeProvider.tsx — owns the Day (light) / Night Flight (dark) theme.
 *
 * The theme is applied as <html data-theme="…">; every token in tokens.css
 * switches automatically. The choice is remembered in localStorage, falling
 * back to the OS preference. index.html applies the same logic before React
 * loads, so there is no white flash on refresh.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

/** localStorage key — must match the inline script in index.html. */
export const THEME_STORAGE_KEY = 'tw_theme';

/** Browser UI colour (mobile address bar) for each theme — mirrors --trip-paper. */
const THEME_COLOR: Record<Theme, string> = { light: '#FFF8EE', dark: '#0B1026' };

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Works out the starting theme: saved choice first, then OS preference.
 * Never throws — localStorage can be blocked in private browsing.
 */
export function readInitialTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked: fall through to the OS preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Wrap the app in this so any component can read or change the theme. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  // Whenever the theme changes: update <html>, the browser UI colour, and remember it.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage blocked: the theme still works for this visit, it just won't be remembered.
    }
  }, [theme]);

  // Stable function identity so consumers don't re-render needlessly.
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'light' ? 'dark' : 'light')), []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

/** Read the current theme and the functions to change it. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
```

- [ ] **Step 6: Create `frontend/src/theme/ThemeToggle.tsx`**

```tsx
/**
 * ThemeToggle.tsx — round sun/moon button that flips Day ↔ Night Flight.
 * The accessible label describes what the button WILL do, not the current state.
 */
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to day theme' : 'Switch to night flight theme'}
      className="grid size-10 place-items-center rounded-full border-2 border-line bg-surface text-ink shadow-pop-sm transition hover:-rotate-12 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky"
    >
      {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
```

- [ ] **Step 7: Load fonts in `frontend/src/main.tsx`**

Add these imports above `import './index.css';`:

```tsx
// Self-hosted variable fonts (Fontsource): no Google Fonts request, faster first paint.
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `npx vitest run src/theme`
Expected: 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add Passport Pop design tokens and day/night theme switching"
```

---

### Task 3: Core UI primitives (Button, Chip, Tag, Input, Card, Skeleton)

**Files:**
- Create: `frontend/src/lib/utils/cn.ts`
- Create: `frontend/src/components/ui/Button.tsx`, `Chip.tsx`, `Input.tsx`, `Card.tsx`, `Skeleton.tsx`
- Test: `frontend/src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: the token utilities from Task 2.
- Produces:
  - `cn(...classes: Array<string | false | null | undefined>): string`
  - `Button(props: ComponentProps<'button'> & { variant?: 'primary'|'secondary'|'ghost'|'glow'; size?: 'sm'|'md'|'lg'; fullWidth?: boolean; loading?: boolean; icon?: ReactNode })`
  - `buttonClasses({ variant?, size?, fullWidth?, className? }): string`, for styling `<Link>`s as buttons
  - `Chip(props: { selected?: boolean; icon?: ReactNode; onSelectedChange?: (next: boolean) => void } & button props)`
  - `Tag({ children, className? })`
  - `Input(props: ComponentProps<'input'> & { label: string; error?: string; hint?: string })`
  - `Card(props: ComponentProps<'div'> & { variant?: 'paper' | 'glass' })`
  - `Skeleton({ className? })`

- [ ] **Step 1: Write the failing test `frontend/src/components/ui/ui.test.tsx`**

```tsx
/**
 * ui.test.tsx — behaviour tests for the shared UI primitives.
 * We test what users experience (roles, labels, states), not CSS classes.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Chip } from './Chip';
import { Input } from './Input';

describe('Button', () => {
  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Plan my trip</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Plan my trip' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and busy while loading (prevents double submits)', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('Chip', () => {
  /** A tiny controlled wrapper, like a real parent component would be. */
  function ControlledChip() {
    const [selected, setSelected] = useState(false);
    return (
      <Chip selected={selected} onSelectedChange={setSelected}>
        Food
      </Chip>
    );
  }

  it('toggles aria-pressed when clicked', async () => {
    render(<ControlledChip />);
    const chip = screen.getByRole('button', { name: 'Food' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Input', () => {
  it('links its label and shows an accessible error', () => {
    render(<Input label="Email" error="Enter a valid email address" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address');
  });

  it('shows a hint when there is no error', () => {
    render(<Input label="Password" hint="At least 8 characters" />);
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/components/ui`
Expected: FAIL with "Failed to resolve import ./Button".

- [ ] **Step 3: Create `frontend/src/lib/utils/cn.ts`**

```ts
/**
 * cn.ts — joins CSS class names, skipping falsy values.
 * Lets components write: cn('base', isActive && 'active', className)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
```

- [ ] **Step 4: Create `frontend/src/components/ui/Button.tsx`**

```tsx
/**
 * Button.tsx — the TripWise button in four flavours:
 *   primary   → coral, outlined, hard shadow (main call-to-action)
 *   secondary → white card face, outlined, hard shadow
 *   ghost     → no border/shadow (low-emphasis actions)
 *   glow      → aurora gradient + glow (reserved for AI actions like "Generate")
 * `buttonClasses()` is exported so <Link>s can look exactly like buttons.
 */
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'glow';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Shared look: pill shape, display font, accessible focus ring, dimmed when disabled. */
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full border-2 font-display font-bold tracking-tight select-none transition disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky';

/** Per-variant colours and effects (all from design tokens). */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-coral text-on-accent border-line shadow-pop pop-press',
  secondary: 'bg-surface text-ink border-line shadow-pop pop-press',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-ink/5',
  glow: 'aurora-fill text-white border-transparent shadow-glow hover:brightness-110',
};

/** Heights are ≥ 36px so buttons stay comfortable touch targets on phones. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-14 px-7 text-lg',
};

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Builds the class string for a button-looking element (used by Button and by links). */
export function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className }: ButtonStyleOptions = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Shows a spinner and disables the button (prevents double submits). */
  loading?: boolean;
  /** Optional leading icon (hidden while loading). */
  icon?: ReactNode;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/ui/Chip.tsx`**

```tsx
/**
 * Chip.tsx — two small pill components:
 *   Chip → a toggle (aria-pressed) used for filters and the interest "stickers".
 *          When selected it turns mustard and tilts, like a sticker slapped on.
 *   Tag  → a static, non-interactive label (e.g. a destination's vibes).
 */
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ChipProps extends ComponentProps<'button'> {
  selected?: boolean;
  icon?: ReactNode;
  /** Called with the NEW selected value when the chip is clicked. */
  onSelectedChange?: (next: boolean) => void;
}

export function Chip({ selected = false, icon, className, children, onClick, onSelectedChange, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={(event) => {
        onClick?.(event);
        onSelectedChange?.(!selected);
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-line px-3.5 py-1.5 text-sm font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky',
        selected ? '-rotate-2 bg-mustard text-on-accent shadow-pop-sm' : 'bg-surface text-ink hover:-rotate-1',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Static label pill — purely informational, not clickable. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line/30 bg-paper-2 px-2.5 py-0.5 text-xs font-semibold capitalize text-ink',
        className,
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/ui/Input.tsx`**

```tsx
/**
 * Input.tsx — labelled text input with hint and error support.
 *
 * Accessibility built in: the <label> is linked by id, errors set aria-invalid,
 * and the hint/error text is announced via aria-describedby.
 * Works with React Hook Form's `register()` because React 19 passes `ref`
 * through as a normal prop (it ends up on the <input> via ...rest).
 */
import { useId, type ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends ComponentProps<'input'> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...rest }: InputProps) {
  // Generate a stable unique id if the caller didn't give one.
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  // Errors win over hints: only one helper message is shown at a time.
  const message = error ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-display text-sm font-bold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'h-12 rounded-2xl border-2 bg-surface px-4 text-base text-ink shadow-pop-sm outline-none transition placeholder:text-ink-soft/70 focus:-translate-y-0.5 focus:shadow-pop focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
      {message && (
        <p id={messageId} className={cn('text-sm', error ? 'font-semibold text-danger' : 'text-ink-soft')}>
          {message}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create `frontend/src/components/ui/Card.tsx` and `Skeleton.tsx`**

`Card.tsx`:
```tsx
/**
 * Card.tsx — content container.
 *   paper → white card face with ink outline + hard shadow (default content look)
 *   glass → frosted translucent panel with glow (AI moments, night-flight vibes)
 */
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export type CardVariant = 'paper' | 'glass';

const VARIANTS: Record<CardVariant, string> = {
  paper: 'border-2 border-line bg-surface shadow-pop',
  glass: 'border border-white/25 bg-white/10 shadow-glow backdrop-blur-xl',
};

export interface CardProps extends ComponentProps<'div'> {
  variant?: CardVariant;
}

export function Card({ variant = 'paper', className, ...rest }: CardProps) {
  return <div className={cn('rounded-card', VARIANTS[variant], className)} {...rest} />;
}
```

`Skeleton.tsx`:
```tsx
/**
 * Skeleton.tsx — pulsing placeholder block shown while data loads.
 * Hidden from screen readers; pair it with a visually-hidden "Loading…" status where needed.
 */
import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-ink/10', className)} />;
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `npx vitest run src/components/ui`
Expected: 6 tests pass.

- [ ] **Step 9: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add Button, Chip, Tag, Input, Card and Skeleton primitives"
```

---

### Task 4: Toast notifications

**Files:**
- Create: `frontend/src/components/ui/Toast.tsx`
- Modify: `frontend/src/test/setup.ts` (skip animations in tests)
- Test: `frontend/src/components/ui/Toast.test.tsx`

**Interfaces:**
- Consumes: `cn`.
- Produces:
  - `ToastProvider`
  - `useToast(): { show(input: ToastInput): void; dismiss(id: number): void }`
  - `ToastInput = { title: string; description?: string; tone?: 'success' | 'error' | 'info'; durationMs?: number }`

- [ ] **Step 1: Write the failing test `frontend/src/components/ui/Toast.test.tsx`**

```tsx
/**
 * Toast.test.tsx — toasts appear in a live region and can be dismissed.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast } from './Toast';

/** Test-only button that fires a toast through the hook, like real components do. */
function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show({ title: 'Trip saved!', tone: 'success' })}>
      fire
    </button>
  );
}

describe('Toast', () => {
  it('shows a toast and removes it when dismissed', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'fire' }));
    expect(await screen.findByText('Trip saved!')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(screen.queryByText('Trip saved!')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/components/ui/Toast.test.tsx`
Expected: FAIL with "Failed to resolve import ./Toast".

- [ ] **Step 3: Create `frontend/src/components/ui/Toast.tsx`**

```tsx
/**
 * Toast.tsx — small pop-up notifications ("Trip saved!", "Welcome back").
 *
 * <ToastProvider> renders a fixed live region; screen readers announce new toasts.
 * Any component calls `useToast().show({...})`. Toasts auto-dismiss after a few
 * seconds, can be closed manually, and at most 3 are visible at once.
 * On phones they sit above the bottom tab bar; on desktop, bottom-right.
 */
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** How long before it closes itself. Default 4000ms. */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Icon + accent colour for each tone. */
const TONES: Record<ToastTone, { icon: typeof Info; accent: string }> = {
  success: { icon: CircleCheck, accent: 'bg-teal' },
  error: { icon: CircleAlert, accent: 'bg-danger' },
  info: { icon: Info, accent: 'bg-sky' },
};

/** Ever-increasing id so React can track each toast. */
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /** Remove one toast by id. */
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  /** Add a toast (keeping only the newest 3) and schedule its auto-dismiss. */
  const show = useCallback(
    ({ title, description, tone = 'info', durationMs = 4000 }: ToastInput) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-2), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      {/* Live region: polite = announced after the user's current action, not interrupting it. */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const { icon: Icon, accent } = TONES[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, rotate: -2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border-2 border-line bg-surface p-3 pr-2 shadow-pop"
              >
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-white', accent)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold">{toast.title}</p>
                  {toast.description && <p className="text-sm text-ink-soft">{toast.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="grid size-8 place-items-center rounded-full hover:bg-ink/5 focus-visible:outline-3 focus-visible:outline-sky"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

/** Show or dismiss toasts from any component inside <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
```

- [ ] **Step 4: Skip Motion animations in tests by appending this to `frontend/src/test/setup.ts`**

```ts
import { MotionGlobalConfig } from 'motion/react';

/**
 * Finish every Motion animation instantly in tests: exit animations would
 * otherwise keep removed elements in the DOM while jsdom "animates" them.
 */
MotionGlobalConfig.skipAnimations = true;
```

Move the new `import` line up next to the other imports at the top of the file.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run src/components/ui`
Expected: all UI tests pass, including the new Toast test.

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add accessible toast notifications"
```

---

### Task 5: API types, errors, slow-request signal and the fetch client

**Files:**
- Create: `frontend/src/lib/api/config.ts`, `types.ts`, `errors.ts`, `slowRequests.ts`, `client.ts`
- Test: `frontend/src/lib/api/client.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - **Config:** `USE_MOCKS: boolean`, `API_BASE: string` and `apiUrl(path: string): string`, which returns an absolute URL.
  - **Types** (`types.ts`): `User`, `Role`, `Vibe`, `BudgetTier`, `Money`, `Destination`, `DestinationFilters`, `Interest`, `Travellers`, `Pace`, `TripRequest`, `Activity`, `Day`, `Itinerary`, `Quota`, `AuthResponse`, `LoginInput`, `SignupInput`, `ApiErrorCode`, `ApiErrorBody`.
  - **Errors:**
    - `class ApiError extends Error { code: ApiErrorCode; status: number; details?: unknown }`
    - `toApiError(status, body): ApiError`
    - `friendlyMessage(code): string`
  - **Slow-request signal:** `slowRequests: { add(delta: number): void; getSnapshot(): number; subscribe(listener): () => void }`
  - **Client factory:** `createApiClient(options?: { fetchImpl?: typeof fetch; slowMs?: number })` returns:
    - `request<T>(path, options?: { method?, body?, skipRefresh?, signal? }): Promise<T>`
    - `refreshSession(): Promise<boolean>`
    - `setAccessToken(token: string | null)`
    - `getAccessToken(): string | null`
    - `setUnauthorizedHandler(fn: (() => void) | null)`
  - **Default instance:** `api` = `createApiClient()`.

- [ ] **Step 1: Write the failing test `frontend/src/lib/api/client.test.ts`**

```ts
/**
 * client.test.ts — the API client is the app's only doorway to the server,
 * so we pin down its tricky behaviours: auth header, error mapping,
 * token refresh (once, even for parallel requests), and slow-server detection.
 * A fake `fetch` is injected so no real network or MSW is involved.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiError } from './errors';
import { slowRequests } from './slowRequests';

/** Build a JSON Response like a real server would send. */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Read the path of whatever URL the client called. */
function pathOf(input: RequestInfo | URL) {
  return new URL(String(input)).pathname;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('sends the bearer token and returns parsed JSON', async () => {
    const fetchImpl = vi.fn(async () => json({ ok: true }));
    const client = createApiClient({ fetchImpl });
    client.setAccessToken('abc');

    await expect(client.request('/ping')).resolves.toEqual({ ok: true });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });

  it('turns an error body into an ApiError with the server code and message', async () => {
    const client = createApiClient({
      fetchImpl: async () => json({ error: { code: 'QUOTA_EXCEEDED', message: 'No more trips today' } }, 429),
    });
    await expect(client.request('/x')).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED', message: 'No more trips today', status: 429 });
  });

  it('maps a non-JSON 502 (proxy HTML page) to a friendly SERVER error', async () => {
    const client = createApiClient({ fetchImpl: async () => new Response('<html>Bad Gateway</html>', { status: 502 }) });
    const error = await client.request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'SERVER', status: 502 });
  });

  it('maps a network failure to a NETWORK error', async () => {
    const client = createApiClient({
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await expect(client.request('/x')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('refreshes once for parallel 401s, then retries both with the new token', async () => {
    let refreshCalls = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = pathOf(input);
      if (path.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return json({ accessToken: 'fresh' });
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer fresh' ? json({ path }) : json({ error: { code: 'UNAUTHORIZED', message: 'expired' } }, 401);
    });
    const client = createApiClient({ fetchImpl });
    client.setAccessToken('stale');

    const results = await Promise.all([client.request('/a'), client.request('/b')]);
    expect(results).toEqual([{ path: expect.stringMatching(/\/a$/) }, { path: expect.stringMatching(/\/b$/) }]);
    expect(refreshCalls).toBe(1);
    expect(client.getAccessToken()).toBe('fresh');
  });

  it('calls the unauthorized handler when refresh fails', async () => {
    const onUnauthorized = vi.fn();
    const client = createApiClient({
      fetchImpl: async () => json({ error: { code: 'UNAUTHORIZED', message: 'nope' } }, 401),
    });
    client.setUnauthorizedHandler(onUnauthorized);

    await expect(client.request('/private')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(client.getAccessToken()).toBeNull();
  });

  it('flags slow requests while they are in flight (cold-start banner signal)', async () => {
    let finish: (r: Response) => void = () => {};
    const client = createApiClient({
      slowMs: 10,
      fetchImpl: () => new Promise<Response>((resolve) => (finish = resolve)),
    });

    const pending = client.request('/slow');
    await new Promise((r) => setTimeout(r, 30));
    expect(slowRequests.getSnapshot()).toBe(1);

    finish(json({ done: true }));
    await pending;
    expect(slowRequests.getSnapshot()).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/lib/api`
Expected: FAIL with "Failed to resolve import ./client".

- [ ] **Step 3: Create `frontend/src/lib/api/config.ts`**

```ts
/**
 * config.ts — where the API lives and whether to fake it.
 *
 * VITE_API_URL may be relative ("/api") or absolute ("https://….onrender.com/api").
 * We always turn it into an absolute URL because Node's fetch (used in tests)
 * rejects relative URLs, and MSW handlers need the exact same URLs as the client.
 */

/** true → the MSW mock backend answers every API call (see src/mocks). */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/** Absolute API base URL with no trailing slash, e.g. "http://localhost:5173/api". */
export const API_BASE = new URL(import.meta.env.VITE_API_URL || '/api', window.location.origin)
  .toString()
  .replace(/\/$/, '');

/** Full URL for an API path. `apiUrl('/auth/me')` → "http://…/api/auth/me". */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
```

- [ ] **Step 4: Create `frontend/src/lib/api/types.ts`**

```ts
/**
 * types.ts — the data contract between frontend and backend.
 *
 * These shapes are copied from the design spec (§5). The mock API (src/mocks)
 * and the real Express backend MUST both return exactly these shapes, which is
 * what lets us switch from mock to real by flipping one env variable.
 */

/* ── Users & auth ─────────────────────────────────────────────────────── */

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  /** ISO date string, e.g. "2026-10-02T09:00:00.000Z" */
  createdAt: string;
  blocked: boolean;
}

/** Returned by login / signup / google: who you are + a short-lived access token. */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

/* ── Destinations ─────────────────────────────────────────────────────── */

export type Vibe = 'beach' | 'mountains' | 'culture' | 'party' | 'adventure' | 'spiritual' | 'food' | 'nature' | 'city' | 'romantic';

export type BudgetTier = 'budget' | 'mid' | 'luxury';

/** Money is always amount + ISO currency code, e.g. { amount: 3500, currency: "INR" }. */
export interface Money {
  amount: number;
  currency: string;
}

export interface Destination {
  id: string;
  /** URL-friendly name used in /destinations/:slug, e.g. "goa" */
  slug: string;
  name: string;
  country: string;
  vibes: Vibe[];
  budgetTier: BudgetTier;
  /** Best months to visit, 1 = January … 12 = December */
  bestMonths: number[];
  summary: string;
  highlights: string[];
  avgDailyCost: Money;
  image: { url: string; credit: string; creditUrl: string };
}

/** Optional filters for GET /destinations. */
export interface DestinationFilters {
  vibe?: Vibe;
  budget?: BudgetTier;
  month?: number;
  q?: string;
}

/* ── Itineraries (used from Plan 2 onward) ────────────────────────────── */

export type Interest = 'food' | 'culture' | 'adventure' | 'nightlife' | 'nature' | 'shopping' | 'history' | 'relaxation' | 'photography' | 'spiritual';

export type Travellers = 'solo' | 'couple' | 'friends' | 'family';

export type Pace = 'chill' | 'balanced' | 'packed';

/** Everything the user tells the planner. */
export interface TripRequest {
  destination: string;
  /** ISO dates "YYYY-MM-DD" */
  startDate: string;
  endDate: string;
  budget: Money;
  travellers: Travellers;
  interests: Interest[];
  pace: Pace;
}

export interface Activity {
  time: 'morning' | 'afternoon' | 'evening';
  title: string;
  description: string;
  location?: string;
  estCost?: number;
}

export interface Day {
  dayNumber: number;
  date: string;
  theme: string;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  /** Present once the user creates a public share link. */
  shareId?: string;
  request: TripRequest;
  title: string;
  summary: string;
  days: Day[];
  estimatedCost: {
    total: number;
    breakdown: { stay: number; food: number; transport: number; activities: number };
    currency: string;
  };
  tips: string[];
  packingList: string[];
  /** Which AI wrote it — shown in admin stats. */
  provider: 'gemini' | 'groq';
  createdAt: string;
}

/** Daily AI-generation allowance. */
export interface Quota {
  used: number;
  limit: number;
  /** ISO time when `used` resets to 0 */
  resetsAt: string;
}

/* ── Errors ───────────────────────────────────────────────────────────── */

/** Machine-readable error codes. NETWORK is client-side only (server unreachable). */
export type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'AI_UNAVAILABLE'
  | 'SERVER'
  | 'NETWORK';

/** Shape of every error response body from the API. */
export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}
```

- [ ] **Step 5: Create `frontend/src/lib/api/errors.ts`**

```ts
/**
 * errors.ts — one error type for everything that can go wrong talking to the API.
 *
 * Components never inspect raw HTTP statuses; they check `error.code`
 * (e.g. 'QUOTA_EXCEEDED') and can show `error.message`, which is always
 * human-friendly — either the server's own message or our fallback below.
 */
import type { ApiErrorBody, ApiErrorCode } from './types';

/** Friendly fallback text for each code, used when the server didn't send a message. */
const FRIENDLY: Record<ApiErrorCode, string> = {
  VALIDATION: 'Some details look off. Please check and try again.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: "You don't have access to that.",
  NOT_FOUND: "We couldn't find that.",
  QUOTA_EXCEEDED: "You've used all your trip generations for today.",
  AI_UNAVAILABLE: 'Both AI planners are busy right now. Try again in a minute.',
  SERVER: 'Something went wrong on our side. Please try again.',
  NETWORK: "We can't reach TripWise right now. Check your connection and try again.",
};

/** The friendly default message for an error code. */
export function friendlyMessage(code: ApiErrorCode): string {
  return FRIENDLY[code];
}

/** A failed API call. `status` is the HTTP status (0 when the network failed). */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Best-guess code when the body didn't include one (e.g. a proxy's HTML error page). */
function statusToCode(status: number): ApiErrorCode {
  if (status === 400 || status === 409 || status === 422) return 'VALIDATION';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'QUOTA_EXCEEDED';
  if (status === 503) return 'AI_UNAVAILABLE';
  return 'SERVER';
}

/** Type guard: does this parsed body look like our `{ error: { code, message } }` shape? */
function isErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const error = (body as { error: unknown }).error;
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: unknown }).code === 'string';
}

/** Turn any failed response (status + parsed body, possibly null) into an ApiError. */
export function toApiError(status: number, body: unknown): ApiError {
  if (isErrorBody(body)) {
    const code = body.error.code in FRIENDLY ? body.error.code : statusToCode(status);
    return new ApiError(code, body.error.message || FRIENDLY[code], status, body.error.details);
  }
  const code = statusToCode(status);
  return new ApiError(code, FRIENDLY[code], status);
}
```

- [ ] **Step 6: Create `frontend/src/lib/api/slowRequests.ts`**

```ts
/**
 * slowRequests.ts — counts API calls that have been waiting longer than ~3s.
 *
 * Why: our free Render backend sleeps when idle and takes ~30s to wake.
 * The client bumps this counter for slow calls; <ServerWakingBanner> reads it
 * (via React's useSyncExternalStore) and explains the wait instead of leaving
 * users staring at a spinner.
 */
type Listener = () => void;

let count = 0;
const listeners = new Set<Listener>();

export const slowRequests = {
  /** +1 when a request turns slow, -1 when that slow request finishes. Never below 0. */
  add(delta: number) {
    count = Math.max(0, count + delta);
    listeners.forEach((listener) => listener());
  },
  /** Current number of slow in-flight requests. */
  getSnapshot(): number {
    return count;
  },
  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
```

- [ ] **Step 7: Create `frontend/src/lib/api/client.ts`**

```ts
/**
 * client.ts — the ONE place the frontend talks to the TripWise API.
 *
 * Every request goes through `request()`, which:
 *  1. builds the absolute URL and JSON body,
 *  2. attaches the in-memory access token (never stored in localStorage → safer vs XSS),
 *  3. sends cookies (the long-lived refresh token is an httpOnly cookie set by the server),
 *  4. on 401: refreshes the access token ONCE (shared by parallel calls) and retries,
 *  5. turns every failure into an ApiError with a friendly message,
 *  6. flags requests slower than `slowMs` so the UI can say "server waking up".
 */
import { apiUrl } from './config';
import { ApiError, friendlyMessage, toApiError } from './errors';
import { slowRequests } from './slowRequests';

export interface ApiClientOptions {
  /** Injected in tests; defaults to the global fetch (which MSW patches in mock mode). */
  fetchImpl?: typeof fetch;
  /** After this many ms a request counts as "slow". Default 3000. */
  slowMs?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Any JSON-serialisable value. */
  body?: unknown;
  /** Don't try the refresh-and-retry dance (login/signup/refresh themselves use this). */
  skipRefresh?: boolean;
  signal?: AbortSignal;
}

export function createApiClient({ fetchImpl = (input, init) => fetch(input, init), slowMs = 3000 }: ApiClientOptions = {}) {
  /** Short-lived JWT kept only in memory; lost on reload and restored via refreshSession(). */
  let accessToken: string | null = null;
  /** The refresh currently in flight, so parallel 401s share one refresh call. */
  let refreshPromise: Promise<boolean> | null = null;
  /** Called when the session is truly over (refresh failed) — AuthProvider logs the user out. */
  let onUnauthorized: (() => void) | null = null;

  /** Low-level send: headers, body, cookies, slow-detection, network-error mapping. */
  async function send(path: string, options: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    // If the server hasn't answered within slowMs, tell the UI (and undo it when done).
    let flaggedSlow = false;
    const slowTimer = setTimeout(() => {
      flaggedSlow = true;
      slowRequests.add(1);
    }, slowMs);

    try {
      return await fetchImpl(apiUrl(path), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: 'include',
        signal: options.signal,
      });
    } catch (error) {
      // A deliberate cancel (e.g. user navigated away) is not a network problem — pass it on.
      if ((error as { name?: string } | null)?.name === 'AbortError') throw error;
      throw new ApiError('NETWORK', friendlyMessage('NETWORK'), 0);
    } finally {
      clearTimeout(slowTimer);
      if (flaggedSlow) slowRequests.add(-1);
    }
  }

  /** Read the body safely: empty → undefined, invalid JSON → friendly error instead of a crash. */
  async function parse<T>(res: Response): Promise<T> {
    const text = res.status === 204 ? '' : await res.text();
    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON (e.g. an HTML error page from a proxy).
        if (res.ok) throw new ApiError('SERVER', friendlyMessage('SERVER'), res.status);
        data = null;
      }
    }
    if (!res.ok) throw toApiError(res.status, data);
    return data as T;
  }

  /**
   * Get a new access token using the httpOnly refresh cookie.
   * Returns true on success. Parallel callers share the same in-flight attempt.
   */
  function refreshSession(): Promise<boolean> {
    refreshPromise ??= (async () => {
      try {
        const data = await request<{ accessToken: string }>('/auth/refresh', { method: 'POST', skipRefresh: true });
        accessToken = data.accessToken;
        return true;
      } catch {
        accessToken = null;
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  /** Make an API call and get typed JSON back (or an ApiError thrown). */
  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    let res = await send(path, options);

    // Access token expired? Refresh once and retry; if that fails the session is over.
    if (res.status === 401 && !options.skipRefresh) {
      if (await refreshSession()) {
        res = await send(path, options);
      } else {
        onUnauthorized?.();
      }
    }
    return parse<T>(res);
  }

  return {
    request,
    refreshSession,
    setAccessToken(token: string | null) {
      accessToken = token;
    },
    getAccessToken() {
      return accessToken;
    },
    setUnauthorizedHandler(handler: (() => void) | null) {
      onUnauthorized = handler;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** The app-wide client instance. */
export const api = createApiClient();
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `npx vitest run src/lib/api`
Expected: 7 tests pass.

- [ ] **Step 9: Run typecheck and commit**

```bash
npm run typecheck
git add frontend
git commit -m "feat(frontend): add typed API contract and fetch client with token refresh and slow-server signal"
```

---

### Task 6: Mock backend (MSW) for auth and destinations, plus typed endpoint helpers

**Files:**
- Create: `frontend/src/mocks/data/users.ts`, `frontend/src/mocks/data/destinations.ts`, `frontend/src/mocks/db.ts`
- Create: `frontend/src/mocks/handlers/shared.ts`, `auth.ts`, `destinations.ts`, `index.ts`
- Create: `frontend/src/mocks/browser.ts`, `frontend/src/mocks/node.ts`
- Create: `frontend/src/lib/api/endpoints.ts`
- Generate: `frontend/public/mockServiceWorker.js` (via `npx msw init`)
- Modify: `frontend/src/test/setup.ts` (start the mock server and reset it after each test), `frontend/src/main.tsx` (start the worker in mock mode)
- Test: `frontend/src/mocks/handlers.test.ts`

**Interfaces:**
- Consumes: `api`, `apiUrl`, `ApiError` and the types from Task 5.
- Produces:
  - **Demo accounts:**
    - `demo@tripwise.app` / `password123` (id `u_demo`, role user)
    - `admin@tripwise.app` / `admin12345` (id `u_admin`, role admin)
    - `blocked@tripwise.app` / `password123` (id `u_blocked`, blocked)
  - **Mock database:** `db`, `resetDb()` and `session: { get(): string | null; set(userId: string): void; clear(): void }`, which simulates the refresh cookie.
  - **Handlers:** `handlers` (all MSW handlers), `worker` (browser) and `server` (Node).
  - **`authApi`:**
    - `login(input): Promise<AuthResponse>`
    - `signup(input): Promise<AuthResponse>`
    - `google(credential: string): Promise<AuthResponse>`
    - `logout(): Promise<void>`
    - `me(): Promise<{ user: User }>`
  - **`destinationsApi`:**
    - `list(filters?): Promise<{ destinations: Destination[] }>`
    - `get(slug): Promise<{ destination: Destination }>`

- [ ] **Step 1: Write the failing test `frontend/src/mocks/handlers.test.ts`**

```ts
/**
 * handlers.test.ts — checks the mock backend behaves like the real API will:
 * correct shapes, correct error codes, filters that actually filter.
 * Goes through the real `api` client + endpoint helpers, so this also proves
 * the client and the mocks agree on URLs.
 */
import { describe, expect, it } from 'vitest';
import { api } from '@/lib/api/client';
import { authApi, destinationsApi } from '@/lib/api/endpoints';
import { session } from './db';

describe('mock auth API', () => {
  it('logs in the demo user and starts a session', async () => {
    const res = await authApi.login({ email: 'demo@tripwise.app', password: 'password123' });
    expect(res.user).toMatchObject({ id: 'u_demo', role: 'user' });
    expect(res.user).not.toHaveProperty('password');
    expect(res.accessToken).toBeTruthy();
    expect(session.get()).toBe('u_demo');
  });

  it('rejects a wrong password with UNAUTHORIZED', async () => {
    await expect(authApi.login({ email: 'demo@tripwise.app', password: 'nope-nope' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Wrong email or password.',
    });
  });

  it('rejects a blocked account with FORBIDDEN', async () => {
    await expect(authApi.login({ email: 'blocked@tripwise.app', password: 'password123' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses to sign up an email that already exists', async () => {
    await expect(authApi.signup({ name: 'Copy Cat', email: 'DEMO@tripwise.app', password: 'password123' })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('restores a session via refresh and returns the current user from /auth/me', async () => {
    session.set('u_admin');
    expect(await api.refreshSession()).toBe(true);
    const { user } = await authApi.me();
    expect(user.role).toBe('admin');
  });
});

describe('mock destinations API', () => {
  it('lists 12 destinations', async () => {
    const { destinations } = await destinationsApi.list();
    expect(destinations).toHaveLength(12);
  });

  it('filters by vibe and budget', async () => {
    const { destinations } = await destinationsApi.list({ vibe: 'beach', budget: 'luxury' });
    expect(destinations.length).toBeGreaterThan(0);
    destinations.forEach((d) => {
      expect(d.vibes).toContain('beach');
      expect(d.budgetTier).toBe('luxury');
    });
  });

  it('returns NOT_FOUND for an unknown slug', async () => {
    await expect(destinationsApi.get('atlantis')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/mocks`
Expected: FAIL with "Failed to resolve import ./db".

- [ ] **Step 3: Create `frontend/src/mocks/data/users.ts`**

```ts
/**
 * users.ts — seed accounts for the mock backend.
 * Passwords are plain text ONLY because this is fake in-browser data;
 * the real backend will store bcrypt hashes.
 */
import type { User } from '@/lib/api/types';

/** A user record as the (fake) database stores it — includes the password. */
export interface MockUser extends User {
  password: string;
}

export const seedUsers: MockUser[] = [
  {
    id: 'u_demo',
    name: 'Demo Traveller',
    email: 'demo@tripwise.app',
    password: 'password123',
    role: 'user',
    createdAt: '2026-09-01T10:00:00.000Z',
    blocked: false,
  },
  {
    id: 'u_admin',
    name: 'Ava Admin',
    email: 'admin@tripwise.app',
    password: 'admin12345',
    role: 'admin',
    createdAt: '2026-08-15T10:00:00.000Z',
    blocked: false,
  },
  {
    id: 'u_blocked',
    name: 'Blocked Bob',
    email: 'blocked@tripwise.app',
    password: 'password123',
    role: 'user',
    createdAt: '2026-09-10T10:00:00.000Z',
    blocked: true,
  },
];
```

- [ ] **Step 4: Create `frontend/src/mocks/data/destinations.ts`**

```ts
/**
 * destinations.ts — 12 seed destinations (6 India, 6 international) for the mock API.
 * Images are free Unsplash photos (Unsplash License: free to use). URLs are stored
 * without size params; components add width/quality via `sizedImage()`.
 * Costs are rough per-person daily averages in INR, for display only.
 */
import type { Destination } from '@/lib/api/types';

/** Shared credit for every seed photo. */
const UNSPLASH = { credit: 'Unsplash', creditUrl: 'https://unsplash.com' };

/** Helper so each entry only lists its photo id. */
const photo = (id: string) => ({ url: `https://images.unsplash.com/photo-${id}`, ...UNSPLASH });

export const seedDestinations: Destination[] = [
  {
    id: 'd_goa',
    slug: 'goa',
    name: 'Goa',
    country: 'India',
    vibes: ['beach', 'party', 'food'],
    budgetTier: 'mid',
    bestMonths: [11, 12, 1, 2, 3],
    summary: 'Sun-soaked beaches, Portuguese lanes and sunsets that turn into beach parties.',
    highlights: ['Fontainhas Latin Quarter', 'Palolem Beach', 'Dudhsagar Falls', 'Anjuna flea market'],
    avgDailyCost: { amount: 3500, currency: 'INR' },
    image: photo('1512343879784-a960bf40e7f2'),
  },
  {
    id: 'd_manali',
    slug: 'manali',
    name: 'Manali',
    country: 'India',
    vibes: ['mountains', 'adventure', 'nature'],
    budgetTier: 'budget',
    bestMonths: [3, 4, 5, 6, 10],
    summary: 'Pine forests, snow peaks and café-hopping in Old Manali.',
    highlights: ['Solang Valley', 'Hidimba Temple', 'Atal Tunnel', 'Old Manali cafés'],
    avgDailyCost: { amount: 2500, currency: 'INR' },
    image: photo('1626621341517-bbf3d9990a23'),
  },
  {
    id: 'd_jaipur',
    slug: 'jaipur',
    name: 'Jaipur',
    country: 'India',
    vibes: ['culture', 'food', 'city'],
    budgetTier: 'mid',
    bestMonths: [10, 11, 12, 1, 2, 3],
    summary: 'The Pink City: palaces, forts and bazaars bursting with colour.',
    highlights: ['Hawa Mahal', 'Amber Fort', 'City Palace', 'Johari Bazaar'],
    avgDailyCost: { amount: 3000, currency: 'INR' },
    image: photo('1477587458883-47145ed94245'),
  },
  {
    id: 'd_kerala',
    slug: 'kerala',
    name: 'Kerala Backwaters',
    country: 'India',
    vibes: ['nature', 'romantic', 'food'],
    budgetTier: 'mid',
    bestMonths: [9, 10, 11, 12, 1, 2, 3],
    summary: 'Drift through palm-lined backwaters on a houseboat in God’s Own Country.',
    highlights: ['Alleppey houseboats', 'Munnar tea gardens', 'Fort Kochi', 'Kathakali show'],
    avgDailyCost: { amount: 4000, currency: 'INR' },
    image: photo('1602216056096-3b40cc0c9944'),
  },
  {
    id: 'd_ladakh',
    slug: 'ladakh',
    name: 'Ladakh',
    country: 'India',
    vibes: ['mountains', 'adventure', 'spiritual'],
    budgetTier: 'mid',
    bestMonths: [5, 6, 7, 8, 9],
    summary: 'High-altitude deserts, turquoise lakes and monasteries on the roof of the world.',
    highlights: ['Pangong Lake', 'Khardung La', 'Nubra Valley', 'Thiksey Monastery'],
    avgDailyCost: { amount: 4500, currency: 'INR' },
    image: photo('1581793745862-99fde7fa73d2'),
  },
  {
    id: 'd_varanasi',
    slug: 'varanasi',
    name: 'Varanasi',
    country: 'India',
    vibes: ['spiritual', 'culture', 'food'],
    budgetTier: 'budget',
    bestMonths: [10, 11, 12, 1, 2, 3],
    summary: 'The world’s oldest living city — ghats, ganga aarti and legendary street food.',
    highlights: ['Dashashwamedh Ghat aarti', 'Sunrise boat ride', 'Sarnath', 'Kachori Gali'],
    avgDailyCost: { amount: 2000, currency: 'INR' },
    image: photo('1561361513-2d000a50f0dc'),
  },
  {
    id: 'd_bali',
    slug: 'bali',
    name: 'Bali',
    country: 'Indonesia',
    vibes: ['beach', 'spiritual', 'nature', 'romantic'],
    budgetTier: 'mid',
    bestMonths: [4, 5, 6, 7, 8, 9],
    summary: 'Rice terraces, temple gates and surf breaks with sunset beach clubs.',
    highlights: ['Ubud rice terraces', 'Uluwatu Temple', 'Nusa Penida', 'Seminyak beach clubs'],
    avgDailyCost: { amount: 6000, currency: 'INR' },
    image: photo('1537996194471-e657df975ab4'),
  },
  {
    id: 'd_paris',
    slug: 'paris',
    name: 'Paris',
    country: 'France',
    vibes: ['romantic', 'culture', 'food', 'city'],
    budgetTier: 'luxury',
    bestMonths: [4, 5, 6, 9, 10],
    summary: 'Cafés, galleries and golden-hour walks along the Seine.',
    highlights: ['Eiffel Tower at night', 'Louvre', 'Montmartre', 'Seine river cruise'],
    avgDailyCost: { amount: 15000, currency: 'INR' },
    image: photo('1502602898657-3e91760cbb34'),
  },
  {
    id: 'd_tokyo',
    slug: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    vibes: ['city', 'food', 'culture', 'party'],
    budgetTier: 'luxury',
    bestMonths: [3, 4, 10, 11],
    summary: 'Neon nights, quiet shrines and the best food crawl of your life.',
    highlights: ['Shibuya Crossing', 'Senso-ji', 'Tsukiji Outer Market', 'teamLab Planets'],
    avgDailyCost: { amount: 12000, currency: 'INR' },
    image: photo('1540959733332-eab4deabeeaf'),
  },
  {
    id: 'd_santorini',
    slug: 'santorini',
    name: 'Santorini',
    country: 'Greece',
    vibes: ['beach', 'romantic'],
    budgetTier: 'luxury',
    bestMonths: [5, 6, 7, 8, 9],
    summary: 'Whitewashed cliffs, blue domes and the most famous sunset in Europe.',
    highlights: ['Oia sunset', 'Red Beach', 'Caldera boat tour', 'Fira to Oia hike'],
    avgDailyCost: { amount: 14000, currency: 'INR' },
    image: photo('1570077188670-e3a8d69ac5ff'),
  },
  {
    id: 'd_dubai',
    slug: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    vibes: ['city', 'adventure', 'party'],
    budgetTier: 'luxury',
    bestMonths: [11, 12, 1, 2, 3],
    summary: 'Sky-high towers, desert dunes and malls with their own ski slopes.',
    highlights: ['Burj Khalifa', 'Desert safari', 'Dubai Marina', 'Old Dubai souks'],
    avgDailyCost: { amount: 13000, currency: 'INR' },
    image: photo('1512453979798-5ea266f8880c'),
  },
  {
    id: 'd_interlaken',
    slug: 'interlaken',
    name: 'Interlaken',
    country: 'Switzerland',
    vibes: ['mountains', 'adventure', 'nature'],
    budgetTier: 'luxury',
    bestMonths: [6, 7, 8, 9, 12, 1],
    summary: 'Alpine lakes, paragliding and train rides straight out of a postcard.',
    highlights: ['Jungfraujoch', 'Paragliding over Interlaken', 'Lake Brienz', 'Grindelwald First'],
    avgDailyCost: { amount: 16000, currency: 'INR' },
    image: photo('1530122037265-a5f1f91d3b99'),
  },
];
```

- [ ] **Step 5: Create `frontend/src/mocks/db.ts`**

```ts
/**
 * db.ts — the mock backend's in-memory "database".
 *
 * Data lives in plain arrays (reset on page reload). The login SESSION is the
 * one thing we persist — in localStorage — to imitate the real backend's
 * httpOnly refresh cookie, so a page refresh keeps you logged in during demos.
 */
import type { Destination, User } from '@/lib/api/types';
import { seedDestinations } from './data/destinations';
import { seedUsers, type MockUser } from './data/users';

interface MockDb {
  users: MockUser[];
  destinations: Destination[];
}

/** Fresh deep copies of the seed data, so tests can mutate freely. */
function createDb(): MockDb {
  return {
    users: structuredClone(seedUsers),
    destinations: structuredClone(seedDestinations),
  };
}

export const db: MockDb = createDb();

/** Put everything back to the seed state (called after every test). */
export function resetDb() {
  Object.assign(db, createDb());
  session.clear();
}

/** localStorage key standing in for the refresh cookie. */
const SESSION_KEY = 'tw_mock_session';

/** The fake "refresh cookie": which user id is logged in. Never throws (storage may be blocked). */
export const session = {
  get(): string | null {
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  set(userId: string) {
    try {
      window.localStorage.setItem(SESSION_KEY, userId);
    } catch {
      // Storage blocked: session simply won't survive a reload.
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

/** Fake access token format: "mock-access.<userId>". The real API uses signed JWTs. */
export function issueAccessToken(userId: string): string {
  return `mock-access.${userId}`;
}

/** Strip the password before sending a user to the client. */
export function publicUser(user: MockUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}
```

- [ ] **Step 6: Create `frontend/src/mocks/handlers/shared.ts`**

```ts
/**
 * shared.ts — small helpers every mock handler uses:
 * consistent error bodies, fake network latency, and "who is calling?".
 */
import { HttpResponse } from 'msw/http';
import type { ApiErrorBody, ApiErrorCode } from '@/lib/api/types';
import { db } from '../db';
import type { MockUser } from '../data/users';

/** Build an error response in the exact `{ error: { code, message } }` shape the real API uses. */
export function errorResponse(status: number, code: ApiErrorCode, message: string) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

/** Pretend to be a real server (250–600ms) in the browser; instant in tests. */
export async function latency() {
  if (import.meta.env.MODE === 'test') return;
  await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 350));
}

/** Find the logged-in user from the "Bearer mock-access.<id>" header (null if missing/blocked). */
export function currentUser(request: Request): MockUser | null {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer mock-access\.(.+)$/.exec(header);
  if (!match) return null;
  const user = db.users.find((u) => u.id === match[1]);
  return user && !user.blocked ? user : null;
}
```

- [ ] **Step 7: Create `frontend/src/mocks/handlers/auth.ts`**

```ts
/**
 * auth.ts (mock) — fake versions of the /auth/* endpoints.
 * Mirrors the real API's behaviour and error codes so the UI can't tell the difference.
 */
import { http, HttpResponse } from 'msw/http';
import { apiUrl } from '@/lib/api/config';
import type { AuthResponse, LoginInput, SignupInput } from '@/lib/api/types';
import type { MockUser } from '../data/users';
import { db, issueAccessToken, publicUser, session } from '../db';
import { currentUser, errorResponse, latency } from './shared';

/** Successful login/signup: start the "cookie" session and return user + token. */
function startSession(user: MockUser) {
  session.set(user.id);
  return HttpResponse.json<AuthResponse>({ user: publicUser(user), accessToken: issueAccessToken(user.id) });
}

/** Case-insensitive email lookup. */
function findByEmail(email: string) {
  return db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export const authHandlers = [
  // POST /auth/signup — create an account (email must be unique, password ≥ 8 chars).
  http.post(apiUrl('/auth/signup'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<SignupInput>;
    if (!body.name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) {
      return errorResponse(400, 'VALIDATION', 'Please give a name, an email and a password of at least 8 characters.');
    }
    if (findByEmail(body.email)) {
      return errorResponse(409, 'VALIDATION', 'An account with this email already exists. Try logging in.');
    }
    const user: MockUser = {
      id: `u_${crypto.randomUUID().slice(0, 8)}`,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      password: body.password,
      role: 'user',
      createdAt: new Date().toISOString(),
      blocked: false,
    };
    db.users.push(user);
    return startSession(user);
  }),

  // POST /auth/login — email + password.
  http.post(apiUrl('/auth/login'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<LoginInput>;
    const user = body.email ? findByEmail(body.email) : undefined;
    if (!user || user.password !== body.password) {
      return errorResponse(401, 'UNAUTHORIZED', 'Wrong email or password.');
    }
    if (user.blocked) {
      return errorResponse(403, 'FORBIDDEN', 'This account has been blocked. Contact support if you think this is a mistake.');
    }
    return startSession(user);
  }),

  // POST /auth/google — the real API verifies a Google ID token; the mock accepts any credential.
  http.post(apiUrl('/auth/google'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as { credential?: string };
    if (!body.credential) return errorResponse(400, 'VALIDATION', 'Missing Google credential.');
    let user = findByEmail('google.explorer@tripwise.app');
    if (!user) {
      user = {
        id: 'u_google',
        name: 'Google Explorer',
        email: 'google.explorer@tripwise.app',
        password: crypto.randomUUID(),
        role: 'user',
        createdAt: new Date().toISOString(),
        blocked: false,
      };
      db.users.push(user);
    }
    return startSession(user);
  }),

  // POST /auth/refresh — swap the session "cookie" for a fresh access token.
  http.post(apiUrl('/auth/refresh'), async () => {
    await latency();
    const user = db.users.find((u) => u.id === session.get());
    if (!user || user.blocked) return errorResponse(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
    return HttpResponse.json({ accessToken: issueAccessToken(user.id) });
  }),

  // POST /auth/logout — end the session.
  http.post(apiUrl('/auth/logout'), async () => {
    await latency();
    session.clear();
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /auth/me — who am I?
  http.get(apiUrl('/auth/me'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in to continue.');
    return HttpResponse.json({ user: publicUser(user) });
  }),
];
```

- [ ] **Step 8: Create `frontend/src/mocks/handlers/destinations.ts`**

```ts
/**
 * destinations.ts (mock) — fake GET /destinations (with filters) and GET /destinations/:slug.
 */
import { http, HttpResponse } from 'msw/http';
import { apiUrl } from '@/lib/api/config';
import { db } from '../db';
import { errorResponse, latency } from './shared';

export const destinationHandlers = [
  // GET /destinations?vibe=&budget=&month=&q= — every filter is optional and they combine (AND).
  http.get(apiUrl('/destinations'), async ({ request }) => {
    await latency();
    const params = new URL(request.url).searchParams;
    const vibe = params.get('vibe');
    const budget = params.get('budget');
    const month = Number(params.get('month')) || null;
    const q = params.get('q')?.trim().toLowerCase();

    const destinations = db.destinations.filter(
      (d) =>
        (!vibe || d.vibes.includes(vibe as (typeof d.vibes)[number])) &&
        (!budget || d.budgetTier === budget) &&
        (!month || d.bestMonths.includes(month)) &&
        (!q || d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)),
    );
    return HttpResponse.json({ destinations });
  }),

  // GET /destinations/:slug — one destination or NOT_FOUND.
  http.get(apiUrl('/destinations/:slug'), async ({ params }) => {
    await latency();
    const destination = db.destinations.find((d) => d.slug === params.slug);
    if (!destination) return errorResponse(404, 'NOT_FOUND', "We couldn't find that destination.");
    return HttpResponse.json({ destination });
  }),
];
```

- [ ] **Step 9: Create `frontend/src/mocks/handlers/index.ts`, `src/mocks/browser.ts` and `src/mocks/node.ts`**

`handlers/index.ts`:
```ts
/**
 * index.ts — every mock API handler in one list.
 * Plans 2 and 3 append itinerary, quota, share and admin handlers here.
 */
import { authHandlers } from './auth';
import { destinationHandlers } from './destinations';

export const handlers = [...authHandlers, ...destinationHandlers];
```

`browser.ts`:
```ts
/**
 * browser.ts — runs the mock API inside the browser via a Service Worker.
 * Only loaded when VITE_USE_MOCKS=true (see main.tsx), so it never ships to real users' requests.
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

`node.ts`:
```ts
/**
 * node.ts — the same mock API for Node (Vitest), intercepting fetch in-process.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

- [ ] **Step 10: Create `frontend/src/lib/api/endpoints.ts`**

```ts
/**
 * endpoints.ts — typed, named functions for each API endpoint.
 * Components and hooks call `authApi.login(...)` instead of hand-writing URLs,
 * so a URL change happens in exactly one place.
 */
import { api } from './client';
import type { AuthResponse, Destination, DestinationFilters, LoginInput, SignupInput, User } from './types';

/** Turn a filters object into "?a=1&b=2", skipping empty values. */
function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Authentication. Login-type calls skip auto-refresh: a 401 there just means "wrong password". */
export const authApi = {
  login: (input: LoginInput) => api.request<AuthResponse>('/auth/login', { method: 'POST', body: input, skipRefresh: true }),
  signup: (input: SignupInput) => api.request<AuthResponse>('/auth/signup', { method: 'POST', body: input, skipRefresh: true }),
  google: (credential: string) =>
    api.request<AuthResponse>('/auth/google', { method: 'POST', body: { credential }, skipRefresh: true }),
  logout: () => api.request<void>('/auth/logout', { method: 'POST', skipRefresh: true }),
  me: () => api.request<{ user: User }>('/auth/me'),
};

/** Public destination catalogue. */
export const destinationsApi = {
  list: (filters: DestinationFilters = {}) =>
    api.request<{ destinations: Destination[] }>(`/destinations${toQuery({ ...filters })}`),
  get: (slug: string) => api.request<{ destination: Destination }>(`/destinations/${encodeURIComponent(slug)}`),
};
```

- [ ] **Step 11: Start the mock server in tests by replacing `frontend/src/test/setup.ts` with the full version below**

```ts
/**
 * setup.ts — runs before every test file.
 *  - DOM matchers (toBeInTheDocument, …)
 *  - the MSW mock API, reset after each test so tests never leak data into each other
 *  - stubs for browser APIs jsdom lacks (matchMedia, scrollTo)
 *  - Motion animations finish instantly
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/node';

// Start intercepting fetch before any test runs.
beforeAll(() => server.listen());

// After each test: unmount UI, drop per-test handler overrides, restore seed data, clear storage.
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  localStorage.clear();
});

afterAll(() => server.close());

/** Finish every Motion animation instantly so exit animations don't linger in jsdom. */
MotionGlobalConfig.skipAnimations = true;

/**
 * jsdom has no window.matchMedia. Components ask it about the OS colour scheme
 * and reduced-motion preference, so we stub it to "no preference" (matches: false).
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

/** jsdom doesn't implement scrolling; React Router's scroll restoration calls it. */
window.scrollTo = () => {};
```

- [ ] **Step 12: Generate the service worker file and start it from `main.tsx` in mock mode**

```bash
npx msw init public --save
```

Expected: this creates `public/mockServiceWorker.js` and adds `"msw": { "workerDirectory": ["public"] }` to `package.json`.

Replace `frontend/src/main.tsx` with:

```tsx
/**
 * main.tsx — browser entry point.
 * 1. Loads fonts + global CSS.
 * 2. In mock mode, starts the MSW service worker BEFORE rendering, so the very
 *    first API call is already intercepted.
 * 3. Mounts <App /> into #root.
 */
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { USE_MOCKS } from './lib/api/config';

/** Start the fake backend only when VITE_USE_MOCKS=true (code-split away otherwise). */
async function enableMocks() {
  if (!USE_MOCKS) return;
  const { worker } = await import('./mocks/browser');
  // Requests we don't mock (fonts, images, Vite files) go straight to the network.
  await worker.start({ onUnhandledFrame: 'bypass' });
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
```

If typecheck reports that `onUnhandledFrame: 'bypass'` is invalid in the installed MSW 3 version, look up the accepted values in `node_modules/msw/lib/browser/index.d.ts` and use the equivalent "bypass" option.

- [ ] **Step 13: Run all tests and typecheck**

```bash
npm test
npm run typecheck
```

Expected: all tests pass, including the 8 new mock-API tests, and typecheck is clean.

- [ ] **Step 14: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add MSW mock backend for auth and destinations with typed endpoint helpers"
```

---

### Task 7: Query client and auth context

**Files:**
- Create: `frontend/src/lib/queryClient.ts`, `frontend/src/features/auth/AuthProvider.tsx`, `frontend/src/test/render.tsx`
- Modify: `frontend/src/test/setup.ts` (clear the access token after each test)
- Test: `frontend/src/features/auth/AuthProvider.test.tsx`, `frontend/src/lib/queryClient.test.ts`

**Interfaces:**
- Consumes: `api`, `authApi` and `ApiError` (Tasks 5 and 6), plus `session` from the mocks.
- Produces:
  - **Query client:** `createQueryClient(): QueryClient` and `shouldRetry(failureCount: number, error: unknown): boolean`.
  - **Auth:** `AuthProvider` and `useAuth()`, which returns:
    - `user: User | null`
    - `status: 'loading' | 'authenticated' | 'guest'`
    - `login(input): Promise<User>`
    - `signup(input): Promise<User>`
    - `loginWithGoogle(credential): Promise<User>`
    - `logout(): Promise<void>`
  - **Test helpers** (`src/test/render.tsx`): `renderWithProviders(ui, { route? })` returns `{ user, queryClient, ...renderResult }`. It wraps the UI in a `MemoryRouter`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/queryClient.test.ts`:
```ts
/**
 * queryClient.test.ts — we only retry failures that a retry can actually fix.
 */
import { describe, expect, it } from 'vitest';
import { ApiError } from './api/errors';
import { shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('retries network and server errors up to twice', () => {
    expect(shouldRetry(0, new ApiError('NETWORK', 'x', 0))).toBe(true);
    expect(shouldRetry(1, new ApiError('SERVER', 'x', 500))).toBe(true);
    expect(shouldRetry(2, new ApiError('SERVER', 'x', 500))).toBe(false);
  });

  it('never retries user errors like 404 or quota exceeded', () => {
    expect(shouldRetry(0, new ApiError('NOT_FOUND', 'x', 404))).toBe(false);
    expect(shouldRetry(0, new ApiError('QUOTA_EXCEEDED', 'x', 429))).toBe(false);
  });
});
```

`frontend/src/features/auth/AuthProvider.test.tsx`:
```tsx
/**
 * AuthProvider.test.tsx — session bootstrap, login and logout.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderWithProviders } from '@/test/render';
import { useAuth } from './AuthProvider';

/** Shows auth state as text and exposes login/logout buttons. */
function AuthProbe() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <p>status: {status}</p>
      <p>user: {user?.name ?? 'none'}</p>
      <button type="button" onClick={() => login({ email: 'demo@tripwise.app', password: 'password123' })}>
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('starts as guest when there is no session', async () => {
    renderWithProviders(<AuthProbe />);
    expect(await screen.findByText('status: guest')).toBeInTheDocument();
  });

  it('restores an existing session on load', async () => {
    session.set('u_demo');
    renderWithProviders(<AuthProbe />);
    expect(await screen.findByText('user: Demo Traveller')).toBeInTheDocument();
    expect(screen.getByText('status: authenticated')).toBeInTheDocument();
  });

  it('logs in and out', async () => {
    const { user } = renderWithProviders(<AuthProbe />);
    await screen.findByText('status: guest');

    await user.click(screen.getByRole('button', { name: 'login' }));
    expect(await screen.findByText('user: Demo Traveller')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'logout' }));
    expect(await screen.findByText('status: guest')).toBeInTheDocument();
    expect(session.get()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/lib/queryClient.test.ts src/features/auth`
Expected: FAIL with "Failed to resolve import".

- [ ] **Step 3: Create `frontend/src/lib/queryClient.ts`**

```ts
/**
 * queryClient.ts — TanStack Query settings for the whole app.
 *
 * TanStack Query caches server data, de-duplicates requests and tracks
 * loading/error states for us. Here we decide when to retry: only for
 * problems a retry can fix (network blips, server hiccups, cold starts).
 */
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/errors';

/** Retry NETWORK/SERVER failures at most twice; never retry 4xx-style user errors. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return error instanceof ApiError && (error.code === 'NETWORK' || error.code === 'SERVER');
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Data stays "fresh" for a minute — no refetch storm when navigating back and forth.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
      // Mutations (generate, save, delete) are never retried automatically — avoids duplicates.
      mutations: { retry: false },
    },
  });
}
```

- [ ] **Step 4: Create `frontend/src/features/auth/AuthProvider.tsx`**

```tsx
/**
 * AuthProvider.tsx — who is logged in, and the actions to change that.
 *
 * On app start it tries to restore the session: the refresh cookie → a new
 * access token → GET /auth/me. Until that finishes, status is 'loading' so
 * protected pages show a loader instead of bouncing you to /login.
 * It also registers the api client's "unauthorized" handler, so an expired
 * session anywhere in the app logs the user out cleanly.
 */
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import type { AuthResponse, LoginInput, SignupInput, User } from '@/lib/api/types';

export type AuthStatus = 'loading' | 'authenticated' | 'guest';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  logout: () => Promise<void>;
}

interface AuthState {
  status: AuthStatus;
  user: User | null;
}

const GUEST: AuthState = { status: 'guest', user: null };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  // If any API call finds the session dead (refresh failed), drop to guest.
  useEffect(() => {
    api.setUnauthorizedHandler(() => setState(GUEST));
    return () => api.setUnauthorizedHandler(null);
  }, []);

  // Restore an existing session once on startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshed = await api.refreshSession();
        const user = refreshed ? (await authApi.me()).user : null;
        if (!cancelled) setState(user ? { status: 'authenticated', user } : GUEST);
      } catch {
        if (!cancelled) setState(GUEST);
      }
    })();
    // StrictMode mounts twice in dev; ignore the result of the abandoned first run.
    return () => {
      cancelled = true;
    };
  }, []);

  /** Shared tail of login/signup/google: keep the token in memory and mark as logged in. */
  const startSession = useCallback((res: AuthResponse) => {
    api.setAccessToken(res.accessToken);
    setState({ status: 'authenticated', user: res.user });
    return res.user;
  }, []);

  const login = useCallback(async (input: LoginInput) => startSession(await authApi.login(input)), [startSession]);
  const signup = useCallback(async (input: SignupInput) => startSession(await authApi.signup(input)), [startSession]);
  const loginWithGoogle = useCallback(
    async (credential: string) => startSession(await authApi.google(credential)),
    [startSession],
  );

  /** Log out on the server if we can, but ALWAYS clear local state and cached data. */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the server is unreachable, the user expects to be logged out here.
    } finally {
      api.setAccessToken(null);
      setState(GUEST);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, signup, loginWithGoogle, logout }),
    [state, login, signup, loginWithGoogle, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

/** Read the auth state and actions from any component inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 5: Create `frontend/src/test/render.tsx`**

```tsx
/**
 * render.tsx — test helpers that wrap a component in the same providers the
 * real app uses (query cache, theme, toasts, auth, router), so tests look
 * like real usage without repeating setup everywhere.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ThemeProvider } from '@/theme/ThemeProvider';

/** A fresh cache per test, with retries off so failures show up immediately. */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

/** Every app-level provider except the router (callers choose MemoryRouter or a data router). */
export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Render `ui` inside all providers + a MemoryRouter starting at `route`. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const result = render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
  return { user, queryClient, ...result };
}
```

- [ ] **Step 6: Clear the in-memory token between tests in `frontend/src/test/setup.ts`**

Add `import { api } from '@/lib/api/client';` to the imports. Then add `api.setAccessToken(null);` inside the existing `afterEach` block, right after `localStorage.clear();`.

- [ ] **Step 7: Run the tests and confirm they pass**

Run: `npm test`
Expected: all tests pass, including the 5 new ones.

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add query client with smart retries and auth context with session restore"
```

---

### Task 8: Login and signup pages

**Files:**
- Create: `frontend/src/features/auth/schemas.ts`, `safeNext.ts`, `useFinishAuth.ts`, `LoginForm.tsx`, `SignupForm.tsx`, `GoogleButton.tsx`, `AuthLayout.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/SignupPage.tsx`
- Test: `frontend/src/features/auth/safeNext.test.ts`, `frontend/src/features/auth/AuthForms.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useToast`, `Button`, `Input`, `Card`, `ApiError`, `USE_MOCKS` and `renderWithProviders`.
- Produces:
  - **Schemas:** `loginSchema`, `signupSchema`, `LoginValues` and `SignupValues`.
  - **Redirect guard:** `safeNext(next: string | null | undefined, fallback = '/passport'): string`.
  - **Post-auth hook:** `useFinishAuth(): (user: User, verb: 'login' | 'signup') => void`. It shows a toast and navigates to the safe `next` path.
  - **Pages:** default-exported `LoginPage` and `SignupPage`. Task 9 routes them as `/login` and `/signup`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/features/auth/safeNext.test.ts`:
```ts
/**
 * safeNext.test.ts — Review Focus #1: the ?next= redirect must never leave TripWise.
 */
import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('allows same-site paths with query strings', () => {
    expect(safeNext('/plan?destination=Goa')).toBe('/plan?destination=Goa');
  });

  it.each([null, undefined, '', 'https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)'])(
    'falls back for unsafe value %s',
    (value) => {
      expect(safeNext(value)).toBe('/passport');
    },
  );
});
```

`frontend/src/features/auth/AuthForms.test.tsx`:
```tsx
/**
 * AuthForms.test.tsx — login/signup forms: validation, server errors, success redirect.
 */
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

/** Mount a form at its route plus simple landing pages so redirects are visible. */
function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route path="/passport" element={<h1>Passport page</h1>} />
      <Route path="/plan" element={<h1>Planner page</h1>} />
    </Routes>,
    { route },
  );
}

describe('LoginForm', () => {
  it('validates the email before calling the server', async () => {
    const { user } = renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('shows the server message for a wrong password', async () => {
    const { user } = renderAt('/login');
    await user.type(screen.getByLabelText('Email'), 'demo@tripwise.app');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('logs in and follows a safe ?next= path', async () => {
    const { user } = renderAt('/login?next=%2Fplan');
    await user.type(screen.getByLabelText('Email'), 'demo@tripwise.app');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Planner page' })).toBeInTheDocument();
  });
});

describe('SignupForm', () => {
  it('requires a password of at least 8 characters', async () => {
    const { user } = renderAt('/signup');
    await user.type(screen.getByLabelText('Your name'), 'Riya');
    await user.type(screen.getByLabelText('Email'), 'riya@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument();
  });

  it('creates an account and lands on the passport page', async () => {
    const { user } = renderAt('/signup');
    await user.type(screen.getByLabelText('Your name'), 'Riya Sharma');
    await user.type(screen.getByLabelText('Email'), 'riya@example.com');
    await user.type(screen.getByLabelText('Password'), 'wanderlust1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Passport page' })).toBeInTheDocument();
  });

  it('tells you when the email is already registered', async () => {
    const { user } = renderAt('/signup');
    await user.type(screen.getByLabelText('Your name'), 'Demo Again');
    await user.type(screen.getByLabelText('Email'), 'demo@tripwise.app');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/features/auth`
Expected: FAIL with "Failed to resolve import ./safeNext".

- [ ] **Step 3: Create `frontend/src/features/auth/safeNext.ts`**

```ts
/**
 * safeNext.ts — sanitises the ?next= redirect after login.
 *
 * Without this, a link like /login?next=//evil.com would bounce a freshly
 * logged-in user to a phishing site (an "open redirect"). We only accept
 * same-site absolute paths: they start with "/" but not "//" or "/\".
 */
export function safeNext(next: string | null | undefined, fallback = '/passport'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
```

- [ ] **Step 4: Create `frontend/src/features/auth/schemas.ts`**

```ts
/**
 * schemas.ts — form validation rules (Zod) for login and signup.
 * The same rules give us TypeScript types for the form values for free.
 * The backend re-validates everything — client checks are for fast, friendly feedback.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ error: 'Enter a valid email address' }),
  password: z.string().min(1, { error: 'Enter your password' }),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: 'Tell us your name (2+ characters)' })
    .max(50, { error: 'Keep it under 50 characters' }),
  email: z.email({ error: 'Enter a valid email address' }),
  password: z
    .string()
    .min(8, { error: 'Use at least 8 characters' })
    .max(72, { error: 'Keep it under 72 characters' }),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
```

- [ ] **Step 5: Create `frontend/src/features/auth/useFinishAuth.ts`**

```ts
/**
 * useFinishAuth.ts — what happens right after any successful login/signup:
 * a friendly toast, then go where the user was heading (safely) or to /passport.
 * Shared by the email forms and the Google button so they behave identically.
 */
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '@/components/ui/Toast';
import type { User } from '@/lib/api/types';
import { safeNext } from './safeNext';

export function useFinishAuth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  return useCallback(
    (user: User, verb: 'login' | 'signup') => {
      const firstName = user.name.split(' ')[0];
      toast.show({
        tone: 'success',
        title: verb === 'signup' ? `Welcome aboard, ${firstName}!` : `Welcome back, ${firstName}!`,
      });
      navigate(safeNext(params.get('next')), { replace: true });
    },
    [navigate, params, toast],
  );
}
```

- [ ] **Step 6: Create `frontend/src/features/auth/LoginForm.tsx`**

```tsx
/**
 * LoginForm.tsx — email + password login.
 * Field errors come from Zod (instant, client-side); server errors (wrong password,
 * blocked account) appear in an alert banner above the fields.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from './AuthProvider';
import { loginSchema, type LoginValues } from './schemas';
import { useFinishAuth } from './useFinishAuth';

export function LoginForm() {
  const { login } = useAuth();
  const finishAuth = useFinishAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  /** Runs only after Zod validation passes. */
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      finishAuth(await login(values), 'login');
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {serverError && <FormAlert message={serverError} />}
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        Log in
      </Button>
    </form>
  );
}

/** Red banner for errors that come back from the server. */
export function FormAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-2xl border-2 border-danger bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
      {message}
    </p>
  );
}
```

- [ ] **Step 7: Create `frontend/src/features/auth/SignupForm.tsx`**

```tsx
/**
 * SignupForm.tsx — create an account with name, email and password.
 * Same pattern as LoginForm: Zod for field errors, an alert for server errors.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from './AuthProvider';
import { FormAlert } from './LoginForm';
import { signupSchema, type SignupValues } from './schemas';
import { useFinishAuth } from './useFinishAuth';

export function SignupForm() {
  const { signup } = useAuth();
  const finishAuth = useFinishAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      finishAuth(await signup(values), 'signup');
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {serverError && <FormAlert message={serverError} />}
      <Input label="Your name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
```

- [ ] **Step 8: Create `frontend/src/features/auth/GoogleButton.tsx`**

```tsx
/**
 * GoogleButton.tsx — "Continue with Google".
 *
 * In mock mode it signs in a fake Google user so the flow can be demoed.
 * Real Google Identity Services (free) is wired up in the backend plan, which
 * needs a Google OAuth client id; until then the button hides outside mock mode.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { USE_MOCKS } from '@/lib/api/config';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from './AuthProvider';
import { useFinishAuth } from './useFinishAuth';

/** Google's multicolour "G" mark, drawn inline (no image request). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12S6.6 21.7 12 21.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function GoogleButton() {
  const { loginWithGoogle } = useAuth();
  const finishAuth = useFinishAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hidden until real Google sign-in exists (backend plan).
  if (!USE_MOCKS) return null;

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      finishAuth(await loginWithGoogle('mock-google-credential'), 'login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" size="lg" fullWidth loading={pending} icon={<GoogleMark />} onClick={handleClick}>
        Continue with Google
      </Button>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 9: Create `frontend/src/features/auth/AuthLayout.tsx`**

```tsx
/**
 * AuthLayout.tsx — shared look for /login and /signup.
 * Left: a "boarding pass" card holding the form. Right (desktop only): an aurora
 * panel with passport stamps — the Passport Pop identity at first touch.
 */
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

interface AuthLayoutProps {
  /** Small mono label on the ticket header, e.g. "BOARDING PASS · LOGIN" */
  ticketLabel: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("New here? Sign up") */
  footer: ReactNode;
}

export function AuthLayout({ ticketLabel, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <Card className="mx-auto w-full max-w-md overflow-hidden">
        {/* Ticket header strip */}
        <div className="flex items-center justify-between border-b-2 border-dashed border-line/40 bg-mustard px-6 py-3 text-on-accent">
          <span className="font-mono text-xs font-bold tracking-[0.2em]">{ticketLabel}</span>
          <span className="font-mono text-xs font-bold">TW · 2026</span>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <header>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
            <p className="mt-2 text-ink-soft">{subtitle}</p>
          </header>
          {children}
          <div className="text-center text-sm text-ink-soft">{footer}</div>
        </div>
      </Card>

      {/* Decorative side panel — hidden from screen readers and on small screens */}
      <div aria-hidden className="relative hidden h-[30rem] overflow-hidden rounded-card border-2 border-line shadow-pop md:block">
        <div className="aurora-fill absolute inset-0" />
        <div className="absolute inset-0 grid place-items-center p-10 text-center text-white">
          <div>
            <p className="font-display text-5xl leading-none font-extrabold">Collect places,<br />not things.</p>
            <p className="mt-4 font-mono text-sm tracking-widest opacity-90">EVERY TRIP = A NEW STAMP</p>
          </div>
        </div>
        <span className="absolute top-8 left-8 -rotate-12 rounded-full border-4 border-double border-white/80 px-4 py-2 font-mono text-sm font-bold text-white">
          GOA ✓
        </span>
        <span className="absolute right-10 bottom-10 rotate-6 rounded-full border-4 border-double border-white/80 px-4 py-2 font-mono text-sm font-bold text-white">
          TOKYO ✓
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Create `frontend/src/pages/LoginPage.tsx` and `SignupPage.tsx`**

`LoginPage.tsx`:
```tsx
/**
 * LoginPage.tsx — route /login. Thin page: layout + form + Google + links.
 * React 19 hoists the <title> element into <head> automatically.
 */
import { Link, useSearchParams } from 'react-router';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { LoginForm } from '@/features/auth/LoginForm';
import { USE_MOCKS } from '@/lib/api/config';

export default function LoginPage() {
  // Keep ?next= when switching to signup so the user still ends up where they were going.
  const [params] = useSearchParams();
  const signupHref = params.get('next') ? `/signup?next=${encodeURIComponent(params.get('next')!)}` : '/signup';

  return (
    <>
      <title>Log in · TripWise</title>
      <AuthLayout
        ticketLabel="BOARDING PASS · LOGIN"
        title="Welcome back"
        subtitle="Your trips are waiting where you left them."
        footer={
          <>
            New to TripWise?{' '}
            <Link to={signupHref} className="font-bold text-ink underline decoration-coral decoration-2 underline-offset-4">
              Create a free account
            </Link>
          </>
        }
      >
        <GoogleButton />
        <LoginForm />
        {USE_MOCKS && (
          <p className="rounded-2xl bg-paper-2 px-4 py-3 text-center font-mono text-xs text-ink-soft">
            Demo: demo@tripwise.app / password123
          </p>
        )}
      </AuthLayout>
    </>
  );
}
```

`SignupPage.tsx`:
```tsx
/**
 * SignupPage.tsx — route /signup.
 */
import { Link, useSearchParams } from 'react-router';
import { AuthLayout } from '@/features/auth/AuthLayout';
import { GoogleButton } from '@/features/auth/GoogleButton';
import { SignupForm } from '@/features/auth/SignupForm';

export default function SignupPage() {
  const [params] = useSearchParams();
  const loginHref = params.get('next') ? `/login?next=${encodeURIComponent(params.get('next')!)}` : '/login';

  return (
    <>
      <title>Sign up · TripWise</title>
      <AuthLayout
        ticketLabel="BOARDING PASS · NEW"
        title="Start your passport"
        subtitle="Free forever. Plan up to 5 AI trips every day."
        footer={
          <>
            Already have an account?{' '}
            <Link to={loginHref} className="font-bold text-ink underline decoration-coral decoration-2 underline-offset-4">
              Log in
            </Link>
          </>
        }
      >
        <GoogleButton />
        <SignupForm />
      </AuthLayout>
    </>
  );
}
```

- [ ] **Step 11: Run the tests and confirm they pass**

Run: `npx vitest run src/features/auth`
Expected: all auth tests pass (12 in total across the 3 files).

- [ ] **Step 12: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add login and signup pages with validation, safe redirects and mock Google sign-in"
```

---

### Task 9: App shell, routing, route guards and the server-waking banner

**Files:**
- Create: `frontend/src/components/layout/Logo.tsx`, `Navbar.tsx`, `MobileTabBar.tsx`, `Footer.tsx`, `ServerWakingBanner.tsx`, `FullPageLoader.tsx`, `RootLayout.tsx`, `RouteGuards.tsx`, `RouteError.tsx`
- Create: `frontend/src/pages/NotFoundPage.tsx`, `ComingSoonPage.tsx`, `PassportPage.tsx`
- Create: `frontend/src/router.tsx`
- Modify: `frontend/src/App.tsx` (full replacement) and `frontend/src/test/render.tsx` (add `renderApp`)
- Delete: `frontend/src/App.test.tsx`
- Test: `frontend/src/router.test.tsx`, `frontend/src/components/layout/ServerWakingBanner.test.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - **Routes:** `routes: RouteObject[]`, with the paths from spec §4. Placeholders cover what isn't built yet.
  - **Guards:** `ProtectedRoute`, `AdminRoute` and `GuestRoute`, used as layout routes that render `<Outlet/>`.
  - **Test helper:** `renderApp(route)` returns `{ router, user, ...renderResult }`.
  - **Placeholders:** `ComingSoonPage({ title })`. Plan 2 and Plan 3 replace these routes with real pages.

- [ ] **Step 1: Add `renderApp` to `frontend/src/test/render.tsx`**

Add these imports:
```tsx
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '@/router';
```

Then add this function at the end of the file:
```tsx
/** Render the WHOLE app (real routes, guards, layout) starting at `route`. */
export function renderApp(route = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [route] });
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const result = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { router, user, queryClient, ...result };
}
```

- [ ] **Step 2: Write the failing tests**

`frontend/src/router.test.tsx`:
```tsx
/**
 * router.test.tsx — route guards and fallbacks, tested through the real app routes.
 */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('routing', () => {
  it('sends guests from a protected page to login, remembering where they were going', async () => {
    const { router } = renderApp('/trips');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Ftrips');
  });

  it('lets a logged-in user into a protected page', async () => {
    session.set('u_demo');
    renderApp('/trips');
    expect(await screen.findByRole('heading', { name: 'My trips' })).toBeInTheDocument();
  });

  it('blocks non-admins from /admin', async () => {
    session.set('u_demo');
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Admins only' })).toBeInTheDocument();
  });

  it('lets admins into /admin', async () => {
    session.set('u_admin');
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
  });

  it('redirects logged-in users away from /login', async () => {
    session.set('u_demo');
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/passport'));
    expect(await screen.findByRole('heading', { name: 'Your passport' })).toBeInTheDocument();
  });

  it('shows the lost-luggage page for unknown URLs', async () => {
    renderApp('/this/does/not/exist');
    expect(await screen.findByRole('heading', { name: 'Lost luggage' })).toBeInTheDocument();
  });

  it('logs out from the passport page', async () => {
    session.set('u_demo');
    const { user, router } = renderApp('/passport');
    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
```

`frontend/src/components/layout/ServerWakingBanner.test.tsx`:
```tsx
/**
 * ServerWakingBanner.test.tsx — Review Focus #3: explain cold starts, then get out of the way.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { slowRequests } from '@/lib/api/slowRequests';
import { ServerWakingBanner } from './ServerWakingBanner';

describe('ServerWakingBanner', () => {
  afterEach(() => {
    act(() => slowRequests.add(-100));
  });

  it('appears while a request is slow and disappears afterwards', () => {
    render(<ServerWakingBanner />);
    expect(screen.queryByText(/waking up/i)).not.toBeInTheDocument();

    act(() => slowRequests.add(1));
    expect(screen.getByText(/waking up/i)).toBeInTheDocument();

    act(() => slowRequests.add(-1));
    expect(screen.queryByText(/waking up/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npx vitest run src/router.test.tsx src/components/layout`
Expected: FAIL with "Failed to resolve import @/router".

- [ ] **Step 4: Create `frontend/src/components/layout/ServerWakingBanner.tsx`**

```tsx
/**
 * ServerWakingBanner.tsx — friendly heads-up during Render free-tier cold starts.
 * Subscribes to the api client's slow-request counter; shows while it's > 0.
 */
import { Plane } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { slowRequests } from '@/lib/api/slowRequests';

export function ServerWakingBanner() {
  const slowCount = useSyncExternalStore(slowRequests.subscribe, slowRequests.getSnapshot);
  if (slowCount === 0) return null;

  return (
    <div role="status" className="sticky top-0 z-50 border-b-2 border-line bg-mustard px-4 py-2 text-center text-sm font-semibold text-on-accent">
      <Plane className="mr-2 inline size-4 animate-bounce" aria-hidden />
      Waking up the TripWise server… free servers nap when idle, this can take up to 30 seconds.
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/components/layout/Logo.tsx` and `FullPageLoader.tsx`**

`Logo.tsx`:
```tsx
/**
 * Logo.tsx — the TripWise wordmark: a tilted coral "stamp" tile with a plane + name.
 */
import { Plane } from 'lucide-react';
import { Link } from 'react-router';

export function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2 rounded-full focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sky">
      <span className="grid size-9 -rotate-6 place-items-center rounded-xl border-2 border-line bg-coral text-on-accent shadow-pop-sm transition group-hover:rotate-0">
        <Plane className="size-5" aria-hidden />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">TripWise</span>
    </Link>
  );
}
```

`FullPageLoader.tsx`:
```tsx
/**
 * FullPageLoader.tsx — centred "plane in flight" loader used while auth restores
 * or a page chunk downloads. Has a screen-reader-only status message.
 */
import { Plane } from 'lucide-react';

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="grid min-h-[50vh] place-items-center">
      <Plane className="size-10 animate-pulse text-teal" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
```

- [ ] **Step 6: Create `frontend/src/components/layout/Navbar.tsx`**

```tsx
/**
 * Navbar.tsx — sticky top bar.
 * Desktop: logo, main links, theme toggle, account area.
 * Mobile: just logo + theme toggle + account (main links live in MobileTabBar).
 */
import { NavLink } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils/cn';
import { ThemeToggle } from '@/theme/ThemeToggle';
import { Logo } from './Logo';

/** Desktop nav link: underline-on-hover, mustard pill when active. */
function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-full px-3 py-1.5 font-display font-bold transition focus-visible:outline-3 focus-visible:outline-sky',
    isActive ? 'bg-mustard text-on-accent' : 'hover:bg-ink/5',
  );
}

/** Two-letter initials for the avatar bubble. */
function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Navbar() {
  const { user, status } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-line bg-paper/85 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/explore" className={navLinkClass}>
            Explore
          </NavLink>
          <NavLink to="/plan" className={navLinkClass}>
            Plan a trip
          </NavLink>
          {user && (
            <NavLink to="/trips" className={navLinkClass}>
              My trips
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* While auth is restoring, render nothing here to avoid a login-button flash. */}
          {status === 'authenticated' && user && (
            <NavLink
              to="/passport"
              aria-label="Your passport"
              className="grid size-10 place-items-center rounded-full border-2 border-line bg-mustard font-display text-sm font-extrabold text-on-accent shadow-pop-sm"
            >
              {initials(user.name)}
            </NavLink>
          )}
          {status === 'guest' && (
            <>
              <NavLink to="/login" className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}>
                Log in
              </NavLink>
              <NavLink to="/signup" className={buttonClasses({ size: 'sm' })}>
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 7: Create `frontend/src/components/layout/MobileTabBar.tsx` and `Footer.tsx`**

`MobileTabBar.tsx`:
```tsx
/**
 * MobileTabBar.tsx — app-style bottom navigation on phones (hidden from md up).
 * Five thumb-reachable tabs; the account tab becomes "Log in" for guests.
 */
import { Compass, House, LogIn, Sparkles, Ticket, UserRound, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils/cn';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function MobileTabBar() {
  const { user } = useAuth();

  const tabs: Tab[] = [
    { to: '/', label: 'Home', icon: House },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/plan', label: 'Plan', icon: Sparkles },
    { to: '/trips', label: 'Trips', icon: Ticket },
    user ? { to: '/passport', label: 'Passport', icon: UserRound } : { to: '/login', label: 'Log in', icon: LogIn },
  ];

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-ink' : 'text-ink-soft')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-mustard text-on-accent')}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

`Footer.tsx`:
```tsx
/**
 * Footer.tsx — site footer with quick links, photo credit and copyright.
 * Extra bottom padding on mobile so the tab bar never covers it.
 */
import { Link } from 'react-router';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-line bg-paper-2 pb-24 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-ink-soft">AI-planned trips for wanderers on any budget. Free, always.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
          <Link to="/explore" className="hover:underline">Explore</Link>
          <Link to="/plan" className="hover:underline">Plan a trip</Link>
          <Link to="/signup" className="hover:underline">Create account</Link>
        </nav>
        <p className="font-mono text-xs text-ink-soft">
          Photos: <a href="https://unsplash.com" className="underline" target="_blank" rel="noreferrer">Unsplash</a> · © {new Date().getFullYear()} TripWise
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 8: Create `frontend/src/components/layout/RootLayout.tsx` and `RouteError.tsx`**

`RootLayout.tsx`:
```tsx
/**
 * RootLayout.tsx — the frame around every page: banner, navbar, page, footer, tab bar.
 * <Outlet /> is where the current route's page renders.
 */
import { Outlet, ScrollRestoration } from 'react-router';
import { Footer } from './Footer';
import { MobileTabBar } from './MobileTabBar';
import { Navbar } from './Navbar';
import { ServerWakingBanner } from './ServerWakingBanner';

export function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Skip link: lets keyboard users jump past the navigation. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-mustard focus:px-4 focus:py-2 focus:font-bold focus:text-on-accent"
      >
        Skip to content
      </a>
      <ServerWakingBanner />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      {/* Scroll to top on new pages, restore position on back/forward. */}
      <ScrollRestoration />
    </div>
  );
}
```

`RouteError.tsx`:
```tsx
/**
 * RouteError.tsx — shown when a page crashes or fails to load (e.g. an old cached
 * chunk after a deploy). Offers a reload instead of a blank white screen.
 */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import NotFoundPage from '@/pages/NotFoundPage';

export function RouteError() {
  const error = useRouteError();

  // A thrown 404 response gets the friendly not-found page.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-mono text-sm font-bold tracking-[0.3em] text-ink-soft">ERROR</p>
      <h1 className="text-4xl font-extrabold">Turbulence!</h1>
      <p className="text-ink-soft">Something went wrong loading this page. A refresh usually fixes it.</p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Go home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create `frontend/src/components/layout/RouteGuards.tsx`**

```tsx
/**
 * RouteGuards.tsx — layout routes that decide who may see their child pages.
 *   ProtectedRoute → logged-in users only (guests go to /login?next=…)
 *   AdminRoute     → admins only (others see an "Admins only" message)
 *   GuestRoute     → logged-OUT users only (login/signup bounce logged-in users onward)
 * While the session is still restoring, all three show a loader — never a wrong redirect.
 */
import { ShieldAlert } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { safeNext } from '@/features/auth/safeNext';
import { FullPageLoader } from './FullPageLoader';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'guest') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'guest') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (user?.role !== 'admin') {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <ShieldAlert className="size-12 text-danger" aria-hidden />
        <h1 className="text-4xl font-extrabold">Admins only</h1>
        <p className="text-ink-soft">This area is for the TripWise crew. Your trips are safe in your passport.</p>
        <Link to="/passport" className={buttonClasses()}>
          Go to my passport
        </Link>
      </div>
    );
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to={safeNext(params.get('next'))} replace />;
  return <Outlet />;
}
```

- [ ] **Step 10: Create the pages `NotFoundPage.tsx`, `ComingSoonPage.tsx` and `PassportPage.tsx`**

`frontend/src/pages/NotFoundPage.tsx`:
```tsx
/**
 * NotFoundPage.tsx — the 404 page ("Lost luggage").
 */
import { Luggage } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <title>Lost luggage · TripWise</title>
      <Luggage className="size-14 -rotate-6 text-coral" aria-hidden />
      <p className="font-mono text-sm font-bold tracking-[0.3em] text-ink-soft">ERROR 404</p>
      <h1 className="text-5xl font-extrabold">Lost luggage</h1>
      <p className="text-ink-soft">This page missed its flight. Let’s get you somewhere better.</p>
      <Link to="/" className={buttonClasses()}>
        Back to home
      </Link>
    </div>
  );
}
```

`frontend/src/pages/ComingSoonPage.tsx`:
```tsx
/**
 * ComingSoonPage.tsx — temporary stand-in for pages built in Plans 2 and 3.
 * Keeps every navigation link working while the app grows.
 */
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <title>{`${title} · TripWise`}</title>
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="-rotate-6 rounded-full border-4 border-double border-teal px-4 py-1 font-mono text-xs font-bold tracking-[0.2em] text-teal">
          BOARDING SOON
        </span>
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="text-ink-soft">This part of TripWise is being built right now. Check back soon!</p>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Back to home
        </Link>
      </Card>
    </div>
  );
}
```

`frontend/src/pages/PassportPage.tsx`:
```tsx
/**
 * PassportPage.tsx — route /passport (profile).
 * Plan 1 version: identity, theme and logout. Plan 2 adds trip stamps and the daily quota meter.
 */
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { ThemeToggle } from '@/theme/ThemeToggle';

export default function PassportPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // ProtectedRoute guarantees a user; this guard only satisfies TypeScript.
  if (!user) return null;

  /** Log out, say goodbye, and land on the login page. */
  async function handleLogout() {
    await logout();
    toast.show({ title: 'Logged out. Safe travels!', tone: 'info' });
    navigate('/login', { replace: true });
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <title>Your passport · TripWise</title>
      <h1 className="text-4xl font-extrabold sm:text-5xl">Your passport</h1>

      <Card className="mt-8 overflow-hidden">
        <div className="flex items-center justify-between bg-teal px-6 py-3 text-white">
          <span className="font-mono text-xs font-bold tracking-[0.25em]">TRIPWISE · PASSPORT</span>
          <span className="font-mono text-xs font-bold uppercase">{user.role}</span>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-line bg-mustard font-display text-3xl font-extrabold text-on-accent shadow-pop-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <dl className="grid flex-1 grid-cols-1 gap-3 font-mono text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs tracking-widest text-ink-soft">NAME</dt>
              <dd className="font-bold">{user.name}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-ink-soft">EMAIL</dt>
              <dd className="font-bold break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-widest text-ink-soft">MEMBER SINCE</dt>
              <dd className="font-bold">{memberSince}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-sm font-semibold text-ink-soft">Day / Night Flight theme</span>
        </div>
        <Button variant="secondary" icon={<LogOut className="size-4" aria-hidden />} onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Create `frontend/src/router.tsx`**

```tsx
/**
 * router.tsx — every URL in TripWise and what renders there (spec §4).
 *
 * Pages are lazy-loaded: each page's code downloads only when first visited,
 * keeping the initial load fast (< 3s target). Guards are "layout routes"
 * wrapping groups of pages. ComingSoon placeholders are swapped for real
 * pages in Plans 2 and 3.
 */
import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { RouteError } from '@/components/layout/RouteError';
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/layout/RouteGuards';
import ComingSoonPage from '@/pages/ComingSoonPage';
import NotFoundPage from '@/pages/NotFoundPage';

/** Turn `() => import('./Page')` into React Router's lazy route format. */
function lazyPage(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    errorElement: <RouteError />,
    children: [
      // Public pages
      { index: true, element: <ComingSoonPage title="Home" /> },
      { path: 'explore', element: <ComingSoonPage title="Explore destinations" /> },
      { path: 'destinations/:slug', element: <ComingSoonPage title="Destination guide" /> },
      { path: 't/:shareId', element: <ComingSoonPage title="Shared trip" /> },

      // Only for logged-out visitors
      {
        Component: GuestRoute,
        children: [
          { path: 'login', lazy: lazyPage(() => import('@/pages/LoginPage')) },
          { path: 'signup', lazy: lazyPage(() => import('@/pages/SignupPage')) },
        ],
      },

      // Only for logged-in users
      {
        Component: ProtectedRoute,
        children: [
          { path: 'plan', element: <ComingSoonPage title="Trip planner" /> },
          { path: 'trips', element: <ComingSoonPage title="My trips" /> },
          { path: 'trips/:id', element: <ComingSoonPage title="Your itinerary" /> },
          { path: 'passport', lazy: lazyPage(() => import('@/pages/PassportPage')) },
        ],
      },

      // Only for admins
      {
        path: 'admin',
        Component: AdminRoute,
        children: [
          { index: true, element: <ComingSoonPage title="Admin dashboard" /> },
          { path: '*', element: <ComingSoonPage title="Admin" /> },
        ],
      },

      // Anything else
      { path: '*', Component: NotFoundPage },
    ],
  },
];
```

- [ ] **Step 12: Replace `frontend/src/App.tsx` and delete `src/App.test.tsx`**

```tsx
/**
 * App.tsx — root component: wires the app-wide providers around the router.
 *
 * Order matters: the query cache is outermost (auth uses it), then theme,
 * motion settings, toasts, auth, and finally the router that renders pages.
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { createQueryClient } from '@/lib/queryClient';
import { routes } from '@/router';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Created once, outside React, so they survive re-renders.
const queryClient = createQueryClient();
const router = createBrowserRouter(routes);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* "user" = follow the OS reduced-motion setting for every Motion animation. */}
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </ToastProvider>
        </MotionConfig>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

```bash
rm src/App.test.tsx
```

- [ ] **Step 13: Run all tests, typecheck and lint**

```bash
npm test
npm run typecheck
npm run lint
```

Expected: everything passes, including the 7 router tests and 1 banner test.

- [ ] **Step 14: Smoke-test in the browser**

Run `npm run dev` and open `http://localhost:5173`. Check each of these:
1. The "Home" placeholder shows with the navbar. On a narrow window, the bottom tab bar appears.
2. Clicking **Plan** goes to Login, and the URL ends in `?next=%2Fplan`.
3. Logging in with `demo@tripwise.app` / `password123` shows the "Welcome back" toast and then the Planner placeholder.
4. Refreshing the page keeps you logged in.
5. The theme toggle switches to Night Flight with the aurora background, and the choice survives a refresh.
6. Visiting `/nowhere` shows "Lost luggage".

- [ ] **Step 15: Commit**

```bash
git add frontend
git commit -m "feat(frontend): add app shell, responsive navigation, route guards and cold-start banner"
```

---

### Task 10: Landing page, Ticket and Stamp, deploy config and README

**Files:**
- Create: `frontend/src/components/ui/Ticket.tsx`, `frontend/src/components/ui/Stamp.tsx`
- Create: `frontend/src/lib/utils/format.ts`, `frontend/src/lib/utils/images.ts`
- Create: `frontend/src/features/explore/hooks.ts`, `frontend/src/features/explore/DestinationCard.tsx`
- Create: `frontend/src/features/landing/Hero.tsx`, `HowItWorks.tsx`, `PopularDestinations.tsx`, `CallToAction.tsx`
- Create: `frontend/src/pages/LandingPage.tsx`, `frontend/vercel.json`, `frontend/README.md`
- Modify: `frontend/src/router.tsx` (the index route uses `LandingPage`)
- Test: `frontend/src/lib/utils/format.test.ts`, `frontend/src/pages/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `destinationsApi`, `renderApp`, the UI primitives and the guards.
- Produces:
  - **Formatting:** `formatMoney(money: Money): string` (for example "₹3,500") and `sizedImage(url: string, width: number): string`.
  - **Data hook:** `useDestinations(filters?)`, a TanStack Query result of `Destination[]` with query key `['destinations', filters]`.
  - **Card:** `DestinationCard({ destination })`.
  - **Ticket:** `Ticket({ children, stub, className? })`, a boarding-pass card with notches and a perforated stub.
  - **Stamp:** `Stamp({ children, tone?: 'teal'|'danger'|'mustard'|'violet', rotate?: number, className? })`.
  - **Page:** default-exported `LandingPage`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/utils/format.test.ts`:
```ts
/**
 * format.test.ts — money and image-URL helpers.
 */
import { describe, expect, it } from 'vitest';
import { sizedImage } from './images';
import { formatMoney } from './format';

describe('formatMoney', () => {
  it('formats INR with Indian digit grouping and no decimals', () => {
    expect(formatMoney({ amount: 125000, currency: 'INR' })).toBe('₹1,25,000');
  });
});

describe('sizedImage', () => {
  it('adds width/quality params to Unsplash URLs', () => {
    expect(sizedImage('https://images.unsplash.com/photo-1', 800)).toBe(
      'https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800&q=70',
    );
  });

  it('leaves other URLs untouched', () => {
    expect(sizedImage('https://example.com/a.jpg', 800)).toBe('https://example.com/a.jpg');
  });
});
```

`frontend/src/pages/LandingPage.test.tsx`:
```tsx
/**
 * LandingPage.test.tsx — the landing page renders, loads destinations from the API,
 * and the quick "Where to?" box hands off to the planner (via login for guests).
 */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';

describe('LandingPage', () => {
  it('shows the hero and popular destinations from the API', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /plan less/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Goa' })).toBeInTheDocument();
  });

  it('sends the quick-plan destination to the planner (through login for guests)', async () => {
    const { user, router } = renderApp('/');
    await user.type(await screen.findByLabelText('Where to?'), 'Goa');
    await user.click(screen.getByRole('button', { name: 'Plan my trip' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/plan?destination=Goa')}`);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/lib/utils src/pages`
Expected: FAIL with "Failed to resolve import ./images".

- [ ] **Step 3: Create `frontend/src/lib/utils/format.ts` and `images.ts`**

`format.ts`:
```ts
/**
 * format.ts — display formatting helpers.
 */
import type { Money } from '@/lib/api/types';

/**
 * "₹3,500" style currency. en-IN gives Indian digit grouping (1,25,000);
 * no decimals because trip estimates are rough anyway.
 */
export function formatMoney({ amount, currency }: Money): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
```

`images.ts`:
```ts
/**
 * images.ts — request right-sized images.
 * Unsplash's CDN resizes on the fly via URL params, so phones download small
 * files (big win for the < 3s load target). Other hosts are left as-is.
 */
export function sizedImage(url: string, width: number): string {
  if (!url.startsWith('https://images.unsplash.com/')) return url;
  return `${url}?auto=format&fit=crop&w=${width}&q=70`;
}
```

- [ ] **Step 4: Create `frontend/src/components/ui/Stamp.tsx` and `Ticket.tsx`**

`Stamp.tsx`:
```tsx
/**
 * Stamp.tsx — a tilted, double-ringed passport stamp ("GOA ✓", "BOARDING SOON").
 * Pure decoration-with-text: badges, achievements, labels.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type StampTone = 'teal' | 'danger' | 'mustard' | 'violet';

const TONES: Record<StampTone, string> = {
  teal: 'border-teal text-teal',
  danger: 'border-danger text-danger',
  mustard: 'border-mustard bg-mustard/15 text-ink',
  violet: 'border-violet text-violet',
};

interface StampProps {
  children: ReactNode;
  tone?: StampTone;
  /** Tilt in degrees — real stamps are never straight. */
  rotate?: number;
  className?: string;
}

export function Stamp({ children, tone = 'teal', rotate = -8, className }: StampProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border-4 border-double px-4 py-1.5 font-mono text-xs font-bold tracking-[0.2em] uppercase',
        TONES[tone],
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}
```

`Ticket.tsx`:
```tsx
/**
 * Ticket.tsx — the boarding-pass card: main body, a perforated line, and a
 * 72px "stub" at the bottom, with half-circle notches cut at the perforation.
 *
 * The notches come from the `ticket-notch` CSS mask (index.css). Masks clip
 * box-shadows, so the outer wrapper uses a drop-shadow filter instead —
 * it follows the notched shape.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface TicketProps {
  children: ReactNode;
  /** Content of the tear-off stub (one line: codes, price, CTA). */
  stub: ReactNode;
  className?: string;
}

export function Ticket({ children, stub, className }: TicketProps) {
  return (
    <div className={cn('drop-shadow-pop', className)}>
      <div className="ticket-notch overflow-hidden rounded-card border-2 border-line bg-surface">
        <div className="p-5">{children}</div>
        {/* Perforation + stub: exactly 72px tall to line up with the notches. */}
        <div className="mx-5 border-t-2 border-dashed border-line/40" />
        <div className="flex h-[70px] items-center justify-between gap-3 px-5">{stub}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `frontend/src/features/explore/hooks.ts` and `DestinationCard.tsx`**

`hooks.ts`:
```ts
/**
 * hooks.ts (explore) — data hooks for destinations.
 * The query key includes the filters, so each filter combo is cached separately
 * and flipping back to a previous filter is instant.
 */
import { useQuery } from '@tanstack/react-query';
import { destinationsApi } from '@/lib/api/endpoints';
import type { DestinationFilters } from '@/lib/api/types';

export function useDestinations(filters: DestinationFilters = {}) {
  return useQuery({
    queryKey: ['destinations', filters],
    queryFn: () => destinationsApi.list(filters),
    select: (data) => data.destinations,
  });
}
```

`DestinationCard.tsx`:
```tsx
/**
 * DestinationCard.tsx — a "postcard" for one destination: photo, name, country,
 * vibe tags, budget stamp and typical daily cost. The whole card links to the
 * destination page.
 */
import { MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Tag } from '@/components/ui/Chip';
import { Stamp } from '@/components/ui/Stamp';
import type { BudgetTier, Destination } from '@/lib/api/types';
import { formatMoney } from '@/lib/utils/format';
import { sizedImage } from '@/lib/utils/images';

/** Budget tier → stamp label + colour. */
const BUDGET_STAMP: Record<BudgetTier, { label: string; tone: 'teal' | 'mustard' | 'violet' }> = {
  budget: { label: '₹ Budget', tone: 'teal' },
  mid: { label: '₹₹ Mid', tone: 'mustard' },
  luxury: { label: '₹₹₹ Luxe', tone: 'violet' },
};

export function DestinationCard({ destination }: { destination: Destination }) {
  const stamp = BUDGET_STAMP[destination.budgetTier];

  return (
    <Link
      to={`/destinations/${destination.slug}`}
      className="group block rounded-card border-2 border-line bg-surface p-3 shadow-pop pop-press focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sky"
    >
      <div className="relative overflow-hidden rounded-xl border-2 border-line">
        <img
          src={sizedImage(destination.image.url, 640)}
          alt={`${destination.name}, ${destination.country}`}
          width={640}
          height={480}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <Stamp tone={stamp.tone} rotate={8} className="absolute top-3 right-3 bg-surface/90">
          {stamp.label}
        </Stamp>
      </div>
      <div className="px-1 pt-3 pb-1">
        <h3 className="text-xl font-extrabold">{destination.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
          <MapPin className="size-3.5" aria-hidden />
          {destination.country}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {destination.vibes.slice(0, 3).map((vibe) => (
            <Tag key={vibe}>{vibe}</Tag>
          ))}
        </div>
        <p className="mt-3 font-mono text-sm">
          from <strong>{formatMoney(destination.avgDailyCost)}</strong>/day
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 6: Create the landing sections**

`frontend/src/features/landing/Hero.tsx`:
```tsx
/**
 * Hero.tsx — first screen of the landing page.
 * Left: headline + the quick "Where to?" box (hands off to /plan?destination=…).
 * Right: a floating sample boarding pass with stamps — shows the product at a glance.
 */
import { ArrowRight, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Stamp } from '@/components/ui/Stamp';
import { Ticket } from '@/components/ui/Ticket';

/** Three sample day lines on the hero ticket. */
const SAMPLE_DAYS = [
  { day: 'DAY 1', text: 'Fontainhas walk → sunset at Vagator' },
  { day: 'DAY 2', text: 'Dudhsagar Falls → spice farm lunch' },
  { day: 'DAY 3', text: 'Palolem kayaking → night market' },
];

export function Hero() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');

  /** Go to the planner, pre-filling the destination if one was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = destination.trim();
    navigate(trimmed ? `/plan?destination=${encodeURIComponent(trimmed)}` : '/plan');
  }

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
      <div>
        <Stamp tone="danger" rotate={-4}>
          AI travel planner · Free
        </Stamp>
        <h1 className="mt-6 text-5xl leading-[0.95] font-extrabold sm:text-6xl lg:text-7xl">
          Plan less.
          <br />
          Wander <span className="relative inline-block text-coral">more.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">
          Tell us where, when and your vibe. TripWise builds a day-by-day itinerary that fits your budget — in seconds.
        </p>

        {/* Quick start: one field, one button. Full details come in the planner. */}
        <form onSubmit={handleSubmit} className="mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
          <label htmlFor="hero-destination" className="sr-only">
            Where to?
          </label>
          <div className="flex h-14 flex-1 items-center gap-2 rounded-full border-2 border-line bg-surface px-5 shadow-pop focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-sky">
            <MapPin className="size-5 shrink-0 text-coral" aria-hidden />
            <input
              id="hero-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Where to? Goa, Bali, Tokyo…"
              className="h-full w-full bg-transparent text-base outline-none placeholder:text-ink-soft/70"
            />
          </div>
          <Button type="submit" size="lg" icon={<ArrowRight className="size-5" aria-hidden />}>
            Plan my trip
          </Button>
        </form>
        <p className="mt-4 font-mono text-xs tracking-wide text-ink-soft">NO CARD · 5 AI TRIPS A DAY · PDF + SHARE</p>
      </div>

      {/* Decorative sample ticket — gently floats (motion respects reduced-motion). */}
      <motion.div
        aria-hidden
        className="relative mx-auto w-full max-w-sm"
        initial={{ opacity: 0, y: 24, rotate: 4 }}
        animate={{ opacity: 1, y: [0, -8, 0], rotate: 3 }}
        transition={{ opacity: { duration: 0.5 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      >
        <Ticket
          stub={
            <>
              <span className="font-mono text-xs font-bold tracking-widest">TW-GOI · 3D</span>
              <span className="font-mono text-sm font-bold">₹12,000</span>
            </>
          }
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold tracking-[0.2em] text-ink-soft">BOARDING PASS</span>
            <span className="rounded-full bg-teal px-2.5 py-0.5 font-mono text-[10px] font-bold text-white">AI PLANNED</span>
          </div>
          <p className="mt-3 font-display text-4xl font-extrabold">Goa</p>
          <p className="text-sm text-ink-soft">Friends · Balanced pace · Beaches & food</p>
          <ul className="mt-4 space-y-2">
            {SAMPLE_DAYS.map((d) => (
              <li key={d.day} className="flex gap-3 text-sm">
                <span className="font-mono text-xs font-bold text-coral">{d.day}</span>
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
        </Ticket>
        <Stamp tone="violet" rotate={-14} className="absolute -top-5 -left-6 bg-paper">
          Bali ✓
        </Stamp>
        <Stamp tone="teal" rotate={10} className="absolute -right-4 -bottom-6 bg-paper">
          Tokyo ✓
        </Stamp>
      </motion.div>
    </section>
  );
}
```

`frontend/src/features/landing/HowItWorks.tsx`:
```tsx
/**
 * HowItWorks.tsx — three numbered steps explaining the product in 5 seconds.
 */
import { Download, Sparkles, Sticker } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const STEPS = [
  { n: '01', icon: Sticker, title: 'Pick your vibe', text: 'Destination, dates, budget and interests — tap stickers, no essays.' },
  { n: '02', icon: Sparkles, title: 'AI plans every day', text: 'Morning to night, with costs, local tips and a packing list.' },
  { n: '03', icon: Download, title: 'Save, share, go', text: 'Download a PDF, send a link to your crew, collect the stamp.' },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="how-heading" className="text-4xl font-extrabold sm:text-5xl">
        How it works
      </h2>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map(({ n, icon: Icon, title, text }, index) => (
          <li key={n}>
            <Card className={index === 1 ? 'h-full p-6 md:-rotate-1' : 'h-full p-6 md:rotate-1'}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-4xl font-bold text-ink/20">{n}</span>
                <span className="grid size-11 place-items-center rounded-xl border-2 border-line bg-mustard text-on-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-extrabold">{title}</h3>
              <p className="mt-2 text-ink-soft">{text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

`frontend/src/features/landing/PopularDestinations.tsx`:
```tsx
/**
 * PopularDestinations.tsx — six destination postcards from the API.
 * Handles all three data states: loading (skeletons), error (retry), success.
 */
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/features/explore/DestinationCard';
import { useDestinations } from '@/features/explore/hooks';

export function PopularDestinations() {
  const { data, isPending, isError, refetch } = useDestinations();

  return (
    <section aria-labelledby="popular-heading" className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="popular-heading" className="text-4xl font-extrabold sm:text-5xl">
            Trending right now
          </h2>
          <p className="mt-2 text-ink-soft">Where TripWise travellers are heading this season.</p>
        </div>
        <Link to="/explore" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
          See all <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isPending &&
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-card border-2 border-line/20 p-3">
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="mt-3 h-6 w-1/2" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          ))}

        {isError && (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-line/40 p-10 text-center">
            <p className="font-semibold">We couldn’t load destinations right now.</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        {data?.slice(0, 6).map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>
    </section>
  );
}
```

`frontend/src/features/landing/CallToAction.tsx`:
```tsx
/**
 * CallToAction.tsx — closing aurora band pushing visitors to start planning.
 */
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';

export function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="relative overflow-hidden rounded-card border-2 border-line shadow-pop-lg">
        <div className="aurora-fill absolute inset-0" aria-hidden />
        <div className="relative flex flex-col items-start gap-6 p-8 text-white sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-4xl font-extrabold sm:text-5xl">Your next trip is 30 seconds away.</h2>
            <p className="mt-3 max-w-xl text-white/90">Free forever. No card. Just vibes and a plan.</p>
          </div>
          <Link to="/plan" className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'shrink-0' })}>
            <Sparkles className="size-5" aria-hidden /> Start planning
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Create `frontend/src/pages/LandingPage.tsx` and wire it into the router**

```tsx
/**
 * LandingPage.tsx — route "/". Composes the landing sections top to bottom.
 */
import { CallToAction } from '@/features/landing/CallToAction';
import { Hero } from '@/features/landing/Hero';
import { HowItWorks } from '@/features/landing/HowItWorks';
import { PopularDestinations } from '@/features/landing/PopularDestinations';

export default function LandingPage() {
  return (
    <>
      <title>TripWise — AI travel itineraries, free</title>
      <Hero />
      <HowItWorks />
      <PopularDestinations />
      <CallToAction />
    </>
  );
}
```

In `frontend/src/router.tsx`, replace
`{ index: true, element: <ComingSoonPage title="Home" /> },`
with:
```tsx
      { index: true, lazy: lazyPage(() => import('@/pages/LandingPage')) },
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `npm test`
Expected: all tests pass, including the 3 format tests and 2 landing tests.

- [ ] **Step 9: Create `frontend/vercel.json`**

Vercel needs this file so deep links like `/trips/123` serve the SPA. Static files such as `mockServiceWorker.js` are still served first.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 10: Create `frontend/README.md`**

````markdown
# TripWise — Frontend

React + TypeScript web app for **TripWise**, the AI travel itinerary planner.
Design language: **"Passport Pop"** — postcard paper & stamps for content, bold outlines for
anything tappable, aurora glow for AI moments and the "Night Flight" dark theme.

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

## Deploy (free) — Vercel

1. Import the GitHub repo in Vercel, set **Root Directory** to `frontend`.
2. Framework preset: Vite. Build command `npm run build`, output `dist`.
3. Add env vars `VITE_API_URL` and `VITE_USE_MOCKS` (keep `true` until the backend is live).
4. `vercel.json` rewrites every route to `index.html` so deep links work.
````

- [ ] **Step 11: Run full verification**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected:
- lint, typecheck and test all print zero errors.
- the build succeeds, and each lazy page appears as a separate chunk in the Vite output.

Then run `npm run dev` and check the landing page in the browser:
1. The hero ticket floats.
2. Six destination postcards load, with skeletons showing briefly first.
3. "Plan my trip" with "Goa" sends a guest to login, then to the Planner placeholder after logging in.
4. Night Flight mode looks right on the landing page.
5. At 360px width there's no horizontal scroll, and the tab bar doesn't cover content.

- [ ] **Step 12: Commit**

```bash
cd ..
git add frontend
git commit -m "feat(frontend): add landing page with boarding-pass hero, destination postcards, deploy config and README"
```
