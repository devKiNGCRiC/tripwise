/**
 * Chaupal.test.tsx — the Toli's chat and activity (demo: in "Kerala Toli" Demo leads and Raj
 * wrote "@demotraveller train please…"; in "Office offsite" Raj leads in announcement mode
 * and Demo is a Sahyatri):
 *   - sending, replying and @mentions; a poll card in the chat can be voted on
 *   - offline: a message waits for signal and is sent once when it's back
 *   - announcement mode: Sahyatris raise a hand instead; leaders see raised hands and allow
 *     one message; a private reply reaches only the asker
 *   - the activity feed; the unread dot on the Tolis link clears once the chat is open
 */
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '@/lib/api/client';
import { apiUrl } from '@/lib/api/config';
import { toliApi } from '@/lib/api/endpoints';
import { db, session } from '@/mocks/db';
import { server } from '@/mocks/node';
import { renderApp } from '@/test/render';

/** The message list. */
const messages = () => screen.findByRole('list', { name: 'Messages' });

/** Log in as someone (mock session) for direct API calls. */
async function loginAs(userId: string) {
  session.set(userId);
  await api.refreshSession();
}

describe('Chaupal', () => {
  beforeEach(() => session.set('u_demo'));

  it('sends, replies and highlights @mentions', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=chaupal');
    const list = await messages();
    const rajsMessage = within(list).getByRole('article', { name: /Raj Roy/ });
    expect(within(rajsMessage).getByText('@demotraveller', { selector: 'mark' })).toBeInTheDocument();

    await user.click(within(rajsMessage).getByRole('button', { name: 'Reply to Raj Roy' }));
    expect(screen.getByText(/Replying to Raj Roy/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Message'), 'Train it is, @king');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    const mine = await within(await messages()).findByRole('article', { name: /Demo Traveller: Train it is/ });
    expect(mine).toHaveTextContent(/↩ Raj Roy: @demotraveller train please/);
    expect(within(mine).getByText('@king', { selector: 'mark' })).toBeInTheDocument();
  });

  it('lets you vote on a poll card in the chat', async () => {
    const { user } = renderApp('/tolis/t_seed_kerala?tab=chaupal');
    const card = await within(await messages()).findByRole('article', { name: 'How shall we travel?' });
    await user.click(within(card).getByRole('radio', { name: /Flight/ }));
    await waitFor(() => expect(db.polls.find((p) => p.id === 'pl_seed_1')!.votes.u_demo).toEqual(['o2']));
  });

  it('keeps a message waiting without signal and sends it once when back', async () => {
    server.use(http.post(apiUrl('/tolis/:id/messages'), () => HttpResponse.error()));
    const { user } = renderApp('/tolis/t_seed_kerala?tab=chaupal');
    await messages();
    await user.type(screen.getByLabelText('Message'), 'Reached Alappuzha!');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/Waiting for signal/)).toBeInTheDocument();
    server.resetHandlers();
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(db.messages.filter((m) => m.text === 'Reached Alappuzha!')).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText(/Waiting for signal/)).not.toBeInTheDocument());
  });

  // A shared family phone: what one person wrote offline is never sent as someone else.
  it('sends a waiting message only from the account that wrote it', async () => {
    server.use(http.post(apiUrl('/tolis/:id/messages'), () => HttpResponse.error()));
    const demo = renderApp('/tolis/t_seed_kerala?tab=chaupal');
    await messages();
    await demo.user.type(screen.getByLabelText('Message'), 'Demo wrote this offline');
    await demo.user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText(/Waiting for signal/);
    demo.unmount();
    server.resetHandlers();

    session.set('u_raj');
    const raj = renderApp('/tolis/t_seed_kerala?tab=chaupal');
    await messages();
    window.dispatchEvent(new Event('online'));
    expect(screen.queryByText(/Waiting for signal/)).not.toBeInTheDocument();
    raj.unmount();

    session.set('u_demo');
    renderApp('/tolis/t_seed_kerala?tab=chaupal');
    await waitFor(() => expect(db.messages.filter((m) => m.text === 'Demo wrote this offline').map((m) => m.authorId)).toEqual(['u_demo']));
  });
});

describe('announcement mode', () => {
  beforeEach(() => session.set('u_demo'));

  it('lets a Sahyatri raise a hand instead of writing', async () => {
    const { user } = renderApp('/tolis/t_seed_office?tab=chaupal');
    await messages();
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('What’s it about?'), 'Bus 2 timing changed');
    await user.click(screen.getByRole('button', { name: 'Raise hand' }));
    expect(await screen.findByText(/Your hand is raised/)).toBeInTheDocument();
  });

  it('shows leaders the raised hands; allowing one message lets exactly one through', async () => {
    await loginAs('u_demo');
    const { anurodh } = await toliApi.raiseHand('t_seed_office', 'Bus 2 timing changed');
    session.set('u_raj');
    const { user, unmount } = renderApp('/tolis/t_seed_office?tab=chaupal');
    const hands = await screen.findByRole('region', { name: 'Raised hands' });
    const request = within(hands).getByRole('article', { name: /Demo Traveller/ });
    expect(request).toHaveTextContent('Bus 2 timing changed');
    await user.click(within(request).getByRole('button', { name: 'Allow 1 message' }));
    await waitFor(() => expect(db.anurodhs.find((a) => a.id === anurodh.id)!.status).toBe('granted'));
    unmount();

    session.set('u_demo');
    const demo = renderApp('/tolis/t_seed_office?tab=chaupal');
    await demo.user.type(await screen.findByLabelText('Message'), 'Bus 2 leaves at 7:40');
    await demo.user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await within(await messages()).findByRole('article', { name: /Bus 2 leaves at 7:40/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Raise hand' })).toBeInTheDocument();
  });

  it('shows a private reply to the asker only', async () => {
    await loginAs('u_demo');
    const { anurodh } = await toliApi.raiseHand('t_seed_office', 'Train time?');
    await loginAs('u_raj');
    await toliApi.decideHand('t_seed_office', anurodh.id, 'reply', '7:40 pm, platform 3');
    session.set('u_demo');
    renderApp('/tolis/t_seed_office?tab=chaupal');
    expect(await screen.findByText(/7:40 pm, platform 3/)).toBeInTheDocument();
  });
});

describe('activity and unread', () => {
  beforeEach(() => session.set('u_demo'));

  it('lists what happened in the Toli', async () => {
    renderApp('/tolis/t_seed_kerala?tab=activity');
    const feed = await screen.findByRole('list', { name: 'Activity' });
    expect(within(feed).getByText(/Raj Roy joined/)).toBeInTheDocument();
    expect(within(feed).getByText(/Demo Traveller started the Toli/)).toBeInTheDocument();
  });

  // Raj has one unread message in each Toli; opening Kerala's chat reads only that one.
  it('counts a Toli’s messages as read once its chat is open', async () => {
    renderApp('/tolis/t_seed_kerala?tab=chaupal');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    await messages();
    await waitFor(() => expect(within(nav).getByRole('link', { name: 'Tolis (1 unread)' })).toBeInTheDocument());
  });
});
