/**
 * Sahyatra.test.tsx — the shared trip tab (demo: Demo leads "Kerala Toli"; its Sahyatra is
 * the Kerala trip; Raj has suggested adding a day and Ananya agreed):
 *   - the plan and the open suggestion with its votes
 *   - suggesting: add a stop to a day, remove a stop
 *   - voting, and leaders approving (the plan changes) — a stale suggestion says so
 *   - Sahyatris see no Approve buttons; a Toli without a plan says so
 */
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { renderApp } from '@/test/render';

/** The open suggestions list. */
const openList = () => screen.findByRole('list', { name: 'Open suggestions' });

describe('Sahyatra tab', () => {
  beforeEach(() => session.set('u_demo'));

  it('shows the shared plan and the open suggestion with its votes', async () => {
    renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    expect(await screen.findByRole('heading', { name: /Day 1/ })).toBeInTheDocument();
    const card = within(await openList()).getByRole('article', { name: /Raj Roy suggests/ });
    expect(card).toHaveTextContent('Add a day: A slow day on the houseboat');
    expect(card).toHaveTextContent('One more lazy day, please!');
    expect(within(card).getByRole('button', { name: 'Agree (1)' })).toBeInTheDocument();
  });

  it('suggests a new stop for a day, and removing a stop', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    const day1 = await screen.findByRole('region', { name: /^Day 1/ });
    await user.click(within(day1).getByRole('button', { name: 'Suggest a stop for Day 1' }));
    await user.type(screen.getByLabelText('Place or experience'), 'Coracle ride');
    await user.type(screen.getByLabelText('Note for the Toli (optional)'), 'Fun for everyone');
    await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(await within(await openList()).findByRole('article', { name: /Demo Traveller suggests/ })).toHaveTextContent('Add Coracle ride to Day 1');

    const firstStop = within(day1).getAllByRole('listitem')[0];
    const title = within(firstStop).getByRole('heading').textContent!;
    await user.click(within(firstStop).getByRole('button', { name: `Suggest a change to ${title}` }));
    await user.click(screen.getByRole('radio', { name: 'Remove it' }));
    await user.click(screen.getByRole('button', { name: 'Send suggestion' }));
    expect(await within(await openList()).findByText(`Remove ${title} from Day 1`)).toBeInTheDocument();
  });

  it('votes, and lets the Sutradhar approve — the plan changes', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    const card = within(await openList()).getByRole('article', { name: /Raj Roy suggests/ });
    await user.click(within(card).getByRole('button', { name: 'Agree (1)' }));
    expect(await within(card).findByRole('button', { name: 'Agree (2)' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(card).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('heading', { name: /Day 5/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Decided suggestions' })).getByText('Approved')).toBeInTheDocument();
  });

  it('says when a suggestion no longer fits the plan', async () => {
    db.sujhavs.push({ id: 'sj_stale', toliId: 't_seed_kerala', authorId: 'u_ananya', change: { kind: 'remove-stop', day: 1, index: 0, title: 'Not in the plan' }, votes: {}, status: 'open', createdAt: new Date().toISOString() });
    const { user } = renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    const card = within(await openList()).getByRole('article', { name: /Ananya Das suggests/ });
    await user.click(within(card).getByRole('button', { name: 'Approve' }));
    expect(await within(card).findByRole('alert')).toHaveTextContent('The plan has changed since this was suggested');
  });

  it('gives Sahyatris no Approve buttons, and says when there is no plan yet', async () => {
    session.set('u_raj');
    renderApp('/tolis/t_seed_kerala?tab=sahyatra');
    await openList();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    session.set('u_demo');
  });

  it('says when the Toli has no Sahyatra yet', async () => {
    renderApp('/tolis/t_seed_office?tab=sahyatra');
    expect(await screen.findByText(/No Sahyatra yet/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Open suggestions' })).not.toBeInTheDocument());
  });
});
