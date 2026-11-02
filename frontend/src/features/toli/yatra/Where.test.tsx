/**
 * Where.test.tsx — "Where are my Sahyatris?" on the Sahyatris tab (demo: Raj shares where he
 * is, near Alappuzha Beach). The phone's location is a stand-in here:
 *   - who is sharing, near which place, how long ago, with Open in Maps
 *   - sharing my own for an hour, and stopping
 *   - when the phone refuses location, nothing is sent and the page says how to allow it
 */
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** Pretend the phone is at a place (or refuses to say). */
function phoneAt(position: { lat: number; lon: number } | 'refused') {
  const answer = (ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    position === 'refused' ? fail?.({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }) : ok({ coords: { latitude: position.lat, longitude: position.lon, accuracy: 20 }, timestamp: Date.now() } as GeolocationPosition);
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: vi.fn(answer), watchPosition: vi.fn((ok, fail) => (answer(ok, fail), 1)), clearWatch: vi.fn() },
  });
}

/** The where-are-we card. */
const card = () => screen.findByRole('region', { name: /^Where are my/ });

describe('Where are my Sahyatris', () => {
  beforeEach(() => session.set('u_demo'));
  afterEach(() => Reflect.deleteProperty(navigator, 'geolocation'));

  it('shows who is sharing, near where, with a maps link', async () => {
    phoneAt({ lat: 9.5, lon: 76.32 });
    renderApp('/tolis/t_seed_kerala?tab=sahyatris');
    const raj = await within(await card()).findByRole('listitem', { name: /Raj Roy/ });
    expect(raj).toHaveTextContent(/near Alappuzha Beach/);
    expect(raj).toHaveTextContent(/ago/);
    expect(within(raj).getByRole('link', { name: 'Open in Maps' }).getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\?q=9\.4935,76\.319/);
  });

  it('shares mine for an hour, then stops', async () => {
    phoneAt({ lat: 9.5, lon: 76.32 });
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatris');
    const where = await card();
    await user.click(await within(where).findByRole('button', { name: 'Share for 1 hour' }));
    expect(await within(where).findByText(/Sharing until/)).toBeInTheDocument();
    expect(db.toliLocations.find((l) => l.userId === 'u_demo')).toMatchObject({ lat: 9.5, lon: 76.32 });
    await user.click(within(where).getByRole('button', { name: 'Stop sharing' }));
    await waitFor(() => expect(db.toliLocations.find((l) => l.userId === 'u_demo')).toBeUndefined());
    expect(await within(where).findByRole('button', { name: 'Share for 1 hour' })).toBeInTheDocument();
  });

  it('sends nothing when the phone refuses location', async () => {
    phoneAt('refused');
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatris');
    const where = await card();
    await user.click(await within(where).findByRole('button', { name: 'Share for 1 hour' }));
    expect(await within(where).findByText(/Allow location to share where you are/)).toBeInTheDocument();
    expect(db.toliLocations.find((l) => l.userId === 'u_demo')).toBeUndefined();
  });
});
