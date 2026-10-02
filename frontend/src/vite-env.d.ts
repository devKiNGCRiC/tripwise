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
