/**
 * browser.ts — runs the mock API inside the browser via a Service Worker.
 * Only loaded when VITE_USE_MOCKS=true (see main.tsx), so it never ships to real users' requests.
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
