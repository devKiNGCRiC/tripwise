/**
 * bootstrap.ts — the start-up sequence: try to start the mock backend, then render.
 *
 * Kept separate from main.tsx so it can be tested. The key rule: a failure to
 * start mocks (service workers blocked in private windows, old browsers) must
 * never leave users on a blank page — we log it and render anyway.
 */
export async function startApp(enableMocks: () => Promise<void>, render: () => void): Promise<void> {
  try {
    await enableMocks();
  } catch (error) {
    console.error('[TripWise] Mock backend failed to start; continuing without it.', error);
  }
  render();
}
