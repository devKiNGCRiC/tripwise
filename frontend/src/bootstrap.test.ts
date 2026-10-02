/**
 * bootstrap.test.ts — the app must render even if the mock backend can't start
 * (e.g. service workers blocked in a private window) — never a blank page.
 */
import { describe, expect, it, vi } from 'vitest';
import { startApp } from './bootstrap';

describe('startApp', () => {
  it('renders after mocks start', async () => {
    const render = vi.fn();
    await startApp(async () => {}, render);
    expect(render).toHaveBeenCalledOnce();
  });

  it('still renders when the mock backend fails to start', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const render = vi.fn();
    await startApp(async () => {
      throw new Error('Service workers are not supported');
    }, render);
    expect(render).toHaveBeenCalledOnce();
  });
});
