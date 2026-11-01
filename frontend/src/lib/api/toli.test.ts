/**
 * toli.test.ts — Tolis through the API client, served by the demo mock (which follows the
 * same rules as the real API, from the shared `@toli-rules`):
 *   create, list and join by invite; outsiders get NOT_FOUND; approving a suggestion changes
 *   the shared trip and a stale one is a CONFLICT; a Tithi poll's winner becomes the Toli's
 *   dates; budgets show only the shared range; announcement mode and a one-message grant;
 *   a message sent twice (offline retry) is stored once; the seeded demo Tolis are there.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { api } from './client';
import { itinerariesApi, toliApi } from './endpoints';

/** Log in as someone (mock session). */
async function loginAs(userId: string) {
  session.set(userId);
  await api.refreshSession();
}

/** "YYYY-MM-DD" n days from now. */
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe('Tolis (demo mock)', () => {
  beforeEach(() => loginAs('u_demo'));

  it('has the seeded Tolis and creates new ones', async () => {
    const { tolis } = await toliApi.list();
    expect(tolis.map((t) => t.name)).toEqual(expect.arrayContaining(['Kerala Toli', 'Office offsite']));
    const { toli } = await toliApi.create({ name: 'Hampi gang', type: 'college' });
    expect(toli).toMatchObject({ announcementMode: true, memberCount: 1, me: { role: 'sutradhar' } });
    expect(toli.inviteUrl).toMatch(/\/toli\/join\//);
  });

  it('joins by invite, and keeps outsiders out', async () => {
    const { toli } = await toliApi.create({ name: 'Join me', type: 'friends' });
    const token = toli.inviteUrl!.split('/').pop()!;
    await loginAs('u_dev');
    await expect(toliApi.get(toli.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await toliApi.invite(token)).invite).toMatchObject({ name: 'Join me', alreadyMember: false });
    expect((await toliApi.join(token)).toli.me.role).toBe('sahyatri');
  });

  it('applies an approved suggestion and refuses a stale one', async () => {
    const kerala = (await toliApi.list()).tolis.find((t) => t.name === 'Kerala Toli')!;
    const trip = (await itinerariesApi.get(kerala.tripId!)).itinerary;
    const first = trip.days[0].activities[0].title;
    const remove = (await toliApi.suggest(kerala.id, { kind: 'remove-stop', day: 1, index: 0, title: first })).sujhav;
    const swap = (await toliApi.suggest(kerala.id, { kind: 'retheme-day', day: 9, theme: 'Nowhere' })).sujhav;
    await toliApi.approveSujhav(kerala.id, remove.id);
    expect((await itinerariesApi.get(kerala.tripId!)).itinerary.days[0].activities[0]?.title).not.toBe(first);
    await expect(toliApi.approveSujhav(kerala.id, swap.id)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('makes a closed Tithi poll the Toli’s dates', async () => {
    const { toli } = await toliApi.create({ name: 'Dates', type: 'friends' });
    const { poll } = await toliApi.createPoll(toli.id, { kind: 'tithi', options: [{ start: inDays(30), end: inDays(33) }, { start: inDays(40), end: inDays(42) }] });
    await toliApi.votePoll(toli.id, poll.id, [poll.options[1].id]);
    await toliApi.closePoll(toli.id, poll.id);
    expect((await toliApi.get(toli.id)).toli.choices).toEqual({ startDate: inDays(40), endDate: inDays(42) });
  });

  it('shows only the shared budget range', async () => {
    const kerala = (await toliApi.list()).tolis.find((t) => t.name === 'Kerala Toli')!;
    const { budget } = await toliApi.setBudget(kerala.id, 2000, 2700);
    expect(budget.mine).toEqual([2000, 2700]);
    expect(budget.group.range).not.toBeNull();
    expect(JSON.stringify(budget)).not.toContain('3500');
  });

  it('keeps announcement mode for leaders, lets one granted message through, and stores a retry once', async () => {
    const office = (await toliApi.list()).tolis.find((t) => t.name === 'Office offsite')!;
    expect(office.me.canPost).toBe(false);
    await expect(toliApi.send(office.id, { text: 'Hello?', clientId: 'mock-1-abcd' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const { anurodh } = await toliApi.raiseHand(office.id, 'Bus timing');
    await loginAs('u_kabir');
    await toliApi.decideHand(office.id, anurodh.id, 'one');
    await loginAs('u_demo');
    const message = { text: 'Bus 2 leaves 7:40', clientId: 'mock-2-abcd' };
    await toliApi.send(office.id, message);
    await toliApi.send(office.id, message);
    const sent = (await toliApi.messages(office.id)).messages.filter((m) => m.text === 'Bus 2 leaves 7:40');
    expect(sent).toHaveLength(1);
    await expect(toliApi.send(office.id, { text: 'Again', clientId: 'mock-3-abcd' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
