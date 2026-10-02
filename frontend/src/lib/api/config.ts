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
