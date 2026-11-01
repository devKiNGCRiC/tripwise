/**
 * ToliPage.test.tsx — Tolis on the website (demo data: Demo leads "Kerala Toli" with Raj and
 * Ananya; Raj leads "Office offsite" where Demo is a Sahyatri):
 *   - Your Tolis lists them; starting a College Toli opens it in announcement mode
 *   - leaders invite on WhatsApp (the message carries the link) or copy the link
 *   - an invite link shows what you'd join, then joins
 *   - the Sahyatris tab: roles, Call buttons for shared numbers, promoting and removing
 *     (leaders only), leaving
 *   - a Toli you're not in says it isn't available; the navbar links to Tolis
 *   - a trip can start a Toli
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

describe('Tolis', () => {
  beforeEach(() => session.set('u_demo'));

  it('lists my Tolis and starts a new one', async () => {
    const { user, router } = renderApp('/tolis');
    expect(await screen.findByRole('link', { name: /Kerala Toli/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Office offsite/ })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Toli name'), 'Hampi gang');
    await user.click(within(screen.getByRole('radiogroup', { name: 'Kind of trip' })).getByRole('radio', { name: /College/ }));
    expect(screen.getByText(/School trips \(under 18\) come later/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create Toli' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/tolis\/t_/));
    expect(await screen.findByRole('heading', { level: 1, name: 'Hampi gang' })).toBeInTheDocument();
    expect(screen.getByText(/Announcement mode/)).toBeInTheDocument();
  });

  it('lets leaders invite on WhatsApp or copy the link', async () => {
    renderApp('/tolis/t_seed_kerala');
    const whatsapp = await screen.findByRole('link', { name: 'Invite on WhatsApp' });
    const href = whatsapp.getAttribute('href')!;
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(href)).toContain('/toli/join/keralaTOLIjoin2026x');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
  });

  it('previews an invite, then joins', async () => {
    session.set('u_dev');
    const { user, router } = renderApp('/toli/join/keralaTOLIjoin2026x');
    expect(await screen.findByRole('heading', { name: /Join Kerala Toli/ })).toBeInTheDocument();
    expect(screen.getByText(/3 Sahyatris/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Join this Toli' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tolis/t_seed_kerala'));
  });

  it('shows the Sahyatris with roles and Call buttons; leaders promote and remove', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatris');
    const raj = await screen.findByRole('listitem', { name: /Raj Roy/ });
    expect(within(raj).getByRole('link', { name: 'Call Raj Roy' })).toHaveAttribute('href', 'tel:+919876543210');
    expect(within(raj).getByRole('link', { name: 'WhatsApp call Raj Roy' })).toHaveAttribute('href', 'https://wa.me/919876543210');
    const ananya = screen.getByRole('listitem', { name: /Ananya Das/ });
    expect(within(ananya).queryByRole('link', { name: /^Call/ })).not.toBeInTheDocument();

    await user.click(within(raj).getByRole('button', { name: 'Make Sah-Sutradhar' }));
    expect(await within(screen.getByRole('listitem', { name: /Raj Roy/ })).findByText('Sah-Sutradhar')).toBeInTheDocument();
    // Ananya still owes money in the Lekha: removing her is refused, and the screen says why.
    await user.click(within(screen.getByRole('listitem', { name: /Ananya Das/ })).getByRole('button', { name: 'Remove Ananya Das' }));
    expect(await within(screen.getByRole('listitem', { name: /Ananya Das/ })).findByRole('alert')).toHaveTextContent(/Settle up first/);
    // Once she has paid Raj back, she can be removed.
    db.toliSettlements.push({ id: 'st_test', toliId: 't_seed_kerala', from: 'u_ananya', to: 'u_raj', amount: 132000, method: 'cash', recordedBy: 'u_demo', clientId: 'test', createdAt: new Date().toISOString() });
    await user.click(within(screen.getByRole('listitem', { name: /Ananya Das/ })).getByRole('button', { name: 'Remove Ananya Das' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: /Ananya Das/ })).not.toBeInTheDocument());
  });

  it('gives Sahyatris no leader buttons, but lets them share a number and leave', async () => {
    const { user, router } = renderApp('/tolis/t_seed_office?tab=sahyatris');
    await screen.findByRole('listitem', { name: /Raj Roy/ });
    expect(screen.queryByRole('button', { name: /^Make Sah-Sutradhar|^Remove/ })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Your phone number (shared with this Toli only)'), '98765 43210');
    await user.click(screen.getByRole('button', { name: 'Share number' }));
    await waitFor(() => expect(db.tolis.find((t) => t.id === 't_seed_office')!.members.find((m) => m.userId === 'u_demo')!.phone).toBe('+919876543210'));
    await user.click(screen.getByRole('button', { name: 'Leave this Toli' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tolis'));
  });

  it("says when a Toli isn't available", async () => {
    session.set('u_dev');
    renderApp('/tolis/t_seed_kerala');
    expect(await screen.findByRole('heading', { name: "This Toli isn't available" })).toBeInTheDocument();
  });

  it('links to Tolis from the navbar', async () => {
    const { user, router } = renderApp('/trips');
    await user.click(await within(await screen.findByRole('navigation', { name: 'Main' })).findByRole('link', { name: /Tolis/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/tolis'));
  });

  it('starts a Toli from a trip', async () => {
    const { user, router } = renderApp('/trips/it_seed_jaipur');
    // Wait for the trip itself before using its buttons.
    await screen.findByRole('heading', { level: 1 });
    await user.click(await screen.findByRole('link', { name: 'Plan with a Toli' }));
    await waitFor(() => expect(router.state.location.search).toBe('?trip=it_seed_jaipur'));
    expect(await screen.findByText(/Starting from your trip/)).toBeInTheDocument();
  });
});
