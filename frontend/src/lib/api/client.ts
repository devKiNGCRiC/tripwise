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
