/**
 * social.test.ts — the demo API for profiles, passports, journals and friends behaves like
 * the real one: the seeded demo world (trips, a journal, friends, requests), the privacy
 * rules for public passports, and the same errors.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '@/lib/api/client';
import { friendsApi, journalApi, passportApi, profileApi, usersApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { session } from './db';

/** Log in as the demo traveller. */
async function asDemo() {
  session.set('u_demo');
  await api.refreshSession();
}

describe('mock social API', () => {
  beforeEach(() => api.setAccessToken(null));

  it("gives the demo traveller two finished trips, one coming up, and a first mark", async () => {
    await asDemo();
    const { passport } = await passportApi.mine();
    expect(passport.stamps.filter((s) => s.status === 'completed').map((s) => s.destination).sort()).toEqual(['Goa', 'Jaipur']);
    expect(passport.stamps.filter((s) => s.status === 'upcoming').map((s) => s.destination)).toEqual(['Kerala Backwaters']);
    expect(passport.marks.find((m) => m.id === 'first-steps')!.earnedAt).not.toBeNull();
    expect(passport.cover.travellerType).toBe('foodie');
    const goa = passport.stamps.find((s) => s.destination === 'Goa')!;
    expect(goa.journal).toMatchObject({ rating: 5, hasMemory: true, photoCount: 2 });
  });

  it('lists one friend, one incoming request and one sent request', async () => {
    await asDemo();
    const list = await friendsApi.list();
    expect(list.friends.map((f) => f.username)).toEqual(['kabir']);
    expect(list.incoming.map((r) => r.user.username)).toEqual(['zoya']);
    expect(list.sent.map((r) => r.user.username)).toEqual(['dev']);
  });

  it("shows Meera's public passport to anyone, but keeps Kabir's for friends", async () => {
    const meera = await passportApi.of('meera');
    expect(meera.passport.cover.name).toBe('Meera Iyer');
    expect(meera.passport.stamps.every((s) => s.status === 'completed')).toBe(true);
    const error = await passportApi.of('kabir').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'NOT_FOUND', message: 'This passport is private' });
    await asDemo();
    expect((await passportApi.of('kabir')).relation).toBe('friend');
  });

  it('keeps usernames unique', async () => {
    await asDemo();
    await expect(profileApi.update({ username: 'meera' })).rejects.toMatchObject({ code: 'VALIDATION', status: 409, message: 'That username is taken' });
    expect((await profileApi.update({ username: 'Demo' })).profile.username).toBe('demo');
  });

  it("won't take a journal for a trip that hasn't happened", async () => {
    await asDemo();
    const kerala = (await passportApi.mine()).passport.stamps.find((s) => s.status === 'upcoming')!;
    await expect(journalApi.save(kerala.id, { rating: 4, memory: 'Soon' })).rejects.toMatchObject({ message: "You can write about this trip once it's over" });
  });

  it('finds people by exact username and accepts invite links', async () => {
    await asDemo();
    expect((await usersApi.card('meera')).relation).toBe('none');
    await expect(usersApi.card('nobody')).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'No traveller with that username' });
    const { friend } = await usersApi.acceptInvite('meeraJOIN1');
    expect(friend.username).toBe('meera');
    expect((await friendsApi.list()).friends.map((f) => f.username).sort()).toEqual(['kabir', 'meera']);
  });
});
