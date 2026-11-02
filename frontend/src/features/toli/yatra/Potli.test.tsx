/**
 * Potli.test.tsx — the Toli's packing list (demo "Kerala Toli": Raj brings the first-aid kit;
 * nobody has the speaker yet; Demo's own list has a charger):
 *   - who brings what; claiming an item and ticking it packed
 *   - adding to the group list and to my own list; my own list is never shown to anyone else
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** The group list and my own list. */
const groupList = () => screen.findByRole('list', { name: 'Group items' });
const myList = () => screen.findByRole('list', { name: 'My own list' });

describe('Potli', () => {
  beforeEach(() => session.set('u_demo'));

  it('shows who brings what, and lets me claim and pack an item', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=potli');
    expect(await screen.findByRole('heading', { name: /^Potli/ })).toBeInTheDocument();
    const group = await groupList();
    expect(within(group).getByRole('listitem', { name: /First-aid kit/ })).toHaveTextContent('Raj Roy brings it');
    const speaker = within(group).getByRole('listitem', { name: /Speaker/ });
    await user.click(within(speaker).getByRole('button', { name: 'I’ll bring it' }));
    expect(await within(speaker).findByText('You bring it')).toBeInTheDocument();
    await user.click(within(speaker).getByRole('checkbox', { name: 'Packed Speaker' }));
    await waitFor(() => expect(db.potliItems.find((i) => i.text === 'Speaker')).toMatchObject({ claimedBy: 'u_demo', packed: true }));
  });

  it('adds to the group list and to my own, and keeps mine private', async () => {
    const { user, unmount } = renderApp('/tolis/t_seed_kerala?tab=potli');
    expect(await within(await myList()).findByRole('listitem', { name: /Charger/ })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Something to pack'), 'Torch');
    await user.click(screen.getByRole('button', { name: 'Add for the group' }));
    await within(await groupList()).findByRole('listitem', { name: /Torch/ });
    await user.type(screen.getByLabelText('Something to pack'), 'Medicines');
    await user.click(screen.getByRole('button', { name: 'Add to my list' }));
    await within(await myList()).findByRole('listitem', { name: /Medicines/ });
    unmount();

    session.set('u_ananya');
    renderApp('/tolis/t_seed_kerala?tab=potli');
    await within(await groupList()).findByRole('listitem', { name: /Torch/ });
    expect(screen.queryByText(/Medicines|Charger/)).not.toBeInTheDocument();
  });

  it('is called the Packing list in English names', async () => {
    db.users.find((u) => u.id === 'u_demo')!.preferences.names = 'english';
    renderApp('/tolis/t_seed_kerala?tab=potli');
    expect(await screen.findByRole('heading', { name: /^Packing list/ })).toBeInTheDocument();
  });
});
