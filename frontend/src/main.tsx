/**
 * main.tsx — browser entry point.
 * 1. Loads fonts + global CSS.
 * 2. In mock mode, starts the MSW service worker BEFORE rendering, so the very
 *    first API call is already intercepted.
 * 3. Mounts <App /> into #root.
 */
// Self-hosted fonts (Fontsource): no Google Fonts request, faster first paint.
// Fraunces — the soft, characterful serif for headlines (all variable axes: weight, optical size, softness), upright + italic.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
// Plus Jakarta Sans — the clean, friendly interface font (variable weight).
import '@fontsource-variable/plus-jakarta-sans/wght.css';
// Tiro Devanagari Hindi — every Hindi name and accent.
import '@fontsource/tiro-devanagari-hindi/400.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startApp } from './bootstrap';
import './index.css';
import { USE_MOCKS } from './lib/api/config';

/** Start the fake backend only when VITE_USE_MOCKS=true (code-split away otherwise). */
async function enableMocks() {
  if (!USE_MOCKS) return;
  const { worker } = await import('./mocks/browser');
  // Requests we don't mock (fonts, images, Vite files) go straight to the network.
  await worker.start({ onUnhandledRequest: 'bypass' });
}

// Render even if the mocks fail to start (see bootstrap.ts) — never a blank page.
startApp(enableMocks, () => {
  // StrictMode double-invokes some logic in development to surface side-effect bugs early.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
