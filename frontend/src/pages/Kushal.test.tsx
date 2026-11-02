/**
 * Kushal.test.tsx — the family check-in (demo: Demo Traveller's contact "Maa" has the link
 * /kushal/maaKUSHALdemo2026xxxxxx). The phone's location is a stand-in here:
 *   - adding a contact gives a link, and a WhatsApp message with it already written
 *   - "Check in now" shows where you last checked in
 *   - the family's page shows only the first name and the latest check-in; a removed link stops
 *   - automatic check-ins happen once on opening when switched on, and never when off
 */
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

const TOKEN = 'maaKUSHALdemo2026xxxxxx';

/** Pretend the phone is near Alappuzha Beach. */
function phoneNearAlappuzha() {
  const answer = (ok: PositionCallback) => ok({ coords: { latitude: 9.4935, longitude: 76.319, accuracy: 30 }, timestamp: Date.now() } as GeolocationPosition);
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn(answer), watchPosition: vi.fn(() => 1), clearWatch: vi.fn() } });
}

describe('Kushal', () => {
  beforeEach(() => {
    session.set('u_demo');
    phoneNearAlappuzha();
  });
  afterEach(() => Reflect.deleteProperty(navigator, 'geolocation'));

  it('adds a family contact with a link to send on WhatsApp', async () => {
    const { user } = renderApp('/kushal');
    expect(await screen.findByRole('heading', { name: /^Kushal/ })).toBeInTheDocument();
    const contacts = await screen.findByRole('list', { name: 'Family contacts' });
    expect(await within(contacts).findByRole('listitem', { name: /Maa/ })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name (e.g. Maa)'), 'Papa');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    const papa = await within(contacts).findByRole('listitem', { name: /Papa/ });
    const whatsapp = within(papa).getByRole('link', { name: 'Send on WhatsApp' }).getAttribute('href')!;
    expect(whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(whatsapp)).toMatch(/\/kushal\/[A-Za-z0-9_-]{24}/);
  });

  it('checks in now and shows where', async () => {
    const { user } = renderApp('/kushal');
    await user.type(await screen.findByLabelText('Note (optional)'), 'Reached safely');
    await user.click(screen.getByRole('button', { name: 'Check in now' }));
    expect(await screen.findByText(/Last check-in: near Alappuzha Beach/)).toBeInTheDocument();
    expect(db.kushal.checkIns.u_demo).toMatchObject({ place: 'near Alappuzha Beach', note: 'Reached safely', lat: 9.49, lon: 76.32 });
  });

  it('shows the family only the first name and the latest check-in', async () => {
    session.clear();
    db.kushal.checkIns.u_demo = { place: 'near Alappuzha Beach', lat: 9.49, lon: 76.32, note: 'All well', at: new Date().toISOString() };
    renderApp(`/kushal/${TOKEN}`);
    expect(await screen.findByText('Demo is near Alappuzha Beach')).toBeInTheDocument();
    expect(screen.getByText(/All well/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Maps' })).toHaveAttribute('href', 'https://www.google.com/maps?q=9.49,76.32');
    expect(document.body).not.toHaveTextContent('demo@tripwise.app');
  });

  it('says when there is no check-in yet, and when a link was removed', async () => {
    session.clear();
    const { unmount } = renderApp(`/kushal/${TOKEN}`);
    expect(await screen.findByText(/No check-in yet from Demo/)).toBeInTheDocument();
    unmount();
    db.kushal.contacts = [];
    renderApp(`/kushal/${TOKEN}`);
    expect(await screen.findByText(/This Kushal link isn’t active/)).toBeInTheDocument();
  });

  it('checks in by itself on opening when switched on — and never when off', async () => {
    const off = renderApp('/passport');
    await screen.findByRole('heading', { name: /Demo Traveller/ });
    await new Promise((r) => setTimeout(r, 300));
    expect(db.kushal.checkIns.u_demo).toBeUndefined();
    off.unmount();

    db.kushal.auto.u_demo = true;
    renderApp('/passport');
    await waitFor(() => expect(db.kushal.checkIns.u_demo?.place).toBe('near Alappuzha Beach'));
  });
});
