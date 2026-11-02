/**
 * Dharas.test.tsx — Dharas, Sangam and notes on the Sahyatra tab (demo "Kerala Toli": on day 2
 * "Backwater walk" (Demo, Ananya) and "Fort Kochi" (Raj) meet at the Boat jetty at 5 pm; a trip
 * note by Demo and a day-1 note by Ananya):
 *   - a day shows its Dharas, stops, who's in each, and the Sangam (Meet-up in English names)
 *   - joining a Dhara moves you; "I'm here" counts you at the Sangam
 *   - a Sahyatri's split waits for a leader
 *   - notes: add one for a day; only your own (or a leader) can be edited
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** A day of the Sahyatra. */
const day = (n: number) => screen.findByRole('region', { name: new RegExp(`^Day ${n} ·`) });

describe('Dharas and Sangam', () => {
  beforeEach(() => session.set('u_demo'));

  it('shows a day’s Dharas, who is in each, and where they meet', async () => {
    renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    const two = await day(2);
    const fort = await within(two).findByRole('article', { name: 'Fort Kochi' });
    expect(fort).toHaveTextContent('Chinese fishing nets');
    expect(fort).toHaveTextContent('Raj Roy');
    expect(within(two).getByText('Sangam · Boat jetty, 5 pm')).toBeInTheDocument();
  });

  it('calls the Sangam a Meet-up in English names', async () => {
    db.users.find((u) => u.id === 'u_demo')!.preferences.names = 'english';
    renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    expect(await within(await day(2)).findByText('Meet-up · Boat jetty, 5 pm')).toBeInTheDocument();
  });

  it('moves you to another Dhara, and counts you at the Sangam', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    const two = await day(2);
    await user.click(await within(two).findByRole('button', { name: 'Join Fort Kochi' }));
    await waitFor(() => expect(db.toliSplits[0].dharas.map((d) => d.memberIds)).toEqual([['u_ananya'], ['u_raj', 'u_demo']]));
    await user.click(within(two).getByRole('button', { name: 'I’m here' }));
    expect(await within(two).findByText(/Here: 1 of 3/)).toBeInTheDocument();
    expect(within(two).getByText(/Missing: Raj Roy, Ananya Das/)).toBeInTheDocument();
  });

  it('keeps a Sahyatri’s split waiting for a leader', async () => {
    session.set('u_ananya');
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    const three = await day(3);
    await user.click(within(three).getByRole('button', { name: 'Split Day 3' }));
    await user.type(within(three).getByLabelText('Dhara 1 name'), 'Spice garden');
    await user.type(within(three).getByLabelText('Dhara 2 name'), 'Lake swim');
    await user.type(within(three).getByLabelText('Where to meet again'), 'Homestay gate');
    await user.type(within(three).getByLabelText('At what time'), '18:30');
    await user.click(within(three).getByRole('button', { name: 'Suggest a split' }));
    expect(await within(three).findByText(/Waiting for a leader/)).toBeInTheDocument();
    expect(db.toliSplits.find((s) => s.day === 3)).toMatchObject({ status: 'proposed', sangam: { place: 'Homestay gate' } });
  });
});

describe('fixed Dharas', () => {
  it('lets the office Toli’s leader set up groups for the whole trip, each with a lead', async () => {
    session.set('u_raj');
    const { user } = renderApp('/tolis/t_seed_office?tab=sahyatra');
    const fixed = await screen.findByRole('region', { name: 'Fixed Dharas' });
    await user.click(within(fixed).getByRole('button', { name: 'Set up fixed Dharas' }));
    await user.type(within(fixed).getByLabelText('Dhara 1 name'), 'Bus 1');
    await user.selectOptions(within(fixed).getByLabelText('Dhara 1 lead'), 'u_ananya');
    await user.type(within(fixed).getByLabelText('Dhara 2 name'), 'Bus 2');
    await user.click(within(fixed).getByRole('button', { name: 'Save fixed Dharas' }));
    const bus1 = await within(fixed).findByRole('article', { name: 'Bus 1' });
    expect(bus1).toHaveTextContent('Lead: Ananya Das');
  });
});

describe('notes', () => {
  beforeEach(() => session.set('u_ananya'));

  it('adds a note for a day, and lets you edit only your own', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    const notes = await screen.findByRole('region', { name: 'Notes' });
    const trip = await within(notes).findByRole('article', { name: /Homestay owner/ });
    expect(within(trip).queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
    const mine = within(notes).getByRole('article', { name: /Carry sunscreen/ });
    await user.click(within(mine).getByRole('button', { name: 'Edit note' }));
    const box = within(mine).getByLabelText('Note');
    await user.clear(box);
    await user.type(box, 'Carry sunscreen and hats');
    await user.click(within(mine).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(db.toliNotes.find((n) => n.id === 'nt_seed_2')!.text).toBe('Carry sunscreen and hats'));

    await user.type(within(notes).getByLabelText('New note'), 'Book the canoe by 9 am');
    await user.selectOptions(within(notes).getByLabelText('For'), '2');
    await user.click(within(notes).getByRole('button', { name: 'Add note' }));
    expect(await within(notes).findByRole('article', { name: /Book the canoe/ })).toHaveTextContent('Day 2');
  });
});
