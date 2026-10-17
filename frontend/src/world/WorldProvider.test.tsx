/**
 * WorldProvider.test.tsx — the shared living world: which region is showing, that the
 * choice is remembered (and survives a stale saved value), the landing-page auto-tour
 * (and that a user's pick ends it for good), quick successive picks, and that the
 * region's accent colour reaches the page.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { REGION_STORAGE_KEY, useWorld, WorldProvider } from './WorldProvider';

/** Test consumer: shows the region and exposes the controls as buttons. */
function Probe() {
  const world = useWorld();
  return (
    <div>
      <p data-testid="region">{world.region.name}</p>
      <p data-testid="touring">{String(world.touring)}</p>
      <button type="button" onClick={() => world.setRegion('ganga', { fromUser: true })}>pick ganga</button>
      <button type="button" onClick={() => world.setRegion('thar', { fromUser: true })}>pick thar</button>
      <button
        type="button"
        onClick={() => {
          world.setRegion('deccan', { fromUser: true });
          world.setRegion('ghats', { fromUser: true });
          world.setRegion('konkan', { fromUser: true });
        }}
      >
        quick picks
      </button>
      <button type="button" onClick={world.startTour}>tour</button>
    </div>
  );
}

function renderWorld() {
  return render(
    <ThemeProvider>
      <WorldProvider>
        <Probe />
      </WorldProvider>
    </ThemeProvider>,
  );
}

/** Click a Probe button by its text (works with fake timers, unlike userEvent). */
const press = (name: string) => act(() => screen.getByRole('button', { name }).click());

describe('WorldProvider', () => {
  afterEach(() => vi.useRealTimers());

  it('starts on Himalaya and remembers a chosen region', () => {
    renderWorld();
    expect(screen.getByTestId('region')).toHaveTextContent('Himalaya');
    press('pick ganga');
    expect(screen.getByTestId('region')).toHaveTextContent('Gangetic Plains');
    expect(localStorage.getItem(REGION_STORAGE_KEY)).toBe('ganga');
  });

  it('opens on the remembered region, and falls back to Himalaya for an unknown one', () => {
    localStorage.setItem(REGION_STORAGE_KEY, 'thar');
    const first = renderWorld();
    expect(screen.getByTestId('region')).toHaveTextContent('Thar');
    first.unmount();

    localStorage.setItem(REGION_STORAGE_KEY, 'mars');
    renderWorld();
    expect(screen.getByTestId('region')).toHaveTextContent('Himalaya');
  });

  it('tours the regions every 10 seconds, and stops for good when the user picks', () => {
    vi.useFakeTimers();
    renderWorld();
    press('tour');
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByTestId('region')).toHaveTextContent('Thar');

    press('pick ganga');
    expect(screen.getByTestId('touring')).toHaveTextContent('false');
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByTestId('region')).toHaveTextContent('Gangetic Plains');
  });

  it('shows the last of several quick picks', () => {
    renderWorld();
    press('quick picks');
    expect(screen.getByTestId('region')).toHaveTextContent('Konkan & Malabar');
  });

  it("puts the region's accent colour on the page", () => {
    renderWorld();
    press('pick thar');
    expect(document.documentElement.style.getPropertyValue('--trip-accent')).toBe('#b8562a');
  });
});

describe('WorldProvider tour after a pick', () => {
  afterEach(() => vi.useRealTimers());

  it('never tours away from a region the traveller already chose (even on a later visit)', () => {
    vi.useFakeTimers();
    localStorage.setItem(REGION_STORAGE_KEY, 'thar');
    renderWorld();
    press('tour');
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByTestId('region')).toHaveTextContent('Thar');
    expect(screen.getByTestId('touring')).toHaveTextContent('false');
  });

  it('does not restart the tour once the traveller has picked', () => {
    vi.useFakeTimers();
    renderWorld();
    press('pick ganga');
    press('tour');
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByTestId('region')).toHaveTextContent('Gangetic Plains');
  });
});
