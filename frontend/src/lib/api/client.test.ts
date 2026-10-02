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
