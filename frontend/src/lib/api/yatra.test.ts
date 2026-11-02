/**
 * yatra.test.ts — being together on the trip, through the API clients, served by the demo mock
 * (rules from the API's own `@yatra-rules`). Seeded "Kerala Toli": day 2 splits into "Backwater
 * walk" (Demo, Ananya) and "Fort Kochi" (Raj), meeting at the Boat jetty; Raj shares where he
 * is (near Alappuzha Beach); a trip note and a day-1 note; a Potli; Demo's Kushal contact "Maa".
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { session } from '@/mocks/db';
import { api } from './client';
import { kushalApi, toliApi } from './endpoints';

/** Log in as someone (mock session). */
async function loginAs(userId: string) {
  session.set(userId);
  await api.refreshSession();
}

const KERALA = 't_seed_kerala';

describe('on the trip (demo mock)', () => {
  beforeEach(() => loginAs('u_demo'));

  it('moves you between Dharas and counts who is at the Sangam', async () => {
    const [split] = (await toliApi.splits(KERALA, 2)).splits;
    expect(split.dharas.map((d) => d.name)).toEqual(['Backwater walk', 'Fort Kochi']);
    expect(split.sangam?.place).toBe('Boat jetty');
    const fort = split.dharas[1];
    const moved = (await toliApi.joinDhara(KERALA, split.id, fort.id)).split;
    expect(moved.dharas.map((d) => d.members.map((m) => m.id))).toEqual([['u_ananya'], ['u_raj', 'u_demo']]);
    const here = (await toliApi.here(KERALA, split.id)).split;
    expect(here.headcount.here.map((p) => p.id)).toEqual(['u_demo']);
    expect(here.headcount.missing.map((p) => p.id)).toEqual(['u_raj', 'u_ananya']);
  });

  it('shows Raj’s shared location until he stops', async () => {
    const { locations, me } = await toliApi.locations(KERALA);
    expect(me).toBeNull();
    expect(locations[0]).toMatchObject({ person: { id: 'u_raj' }, near: { name: 'Alappuzha Beach' } });
    expect(locations[0].mapsLink).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    await loginAs('u_raj');
    await toliApi.stopSharing(KERALA);
    await loginAs('u_demo');
    expect((await toliApi.locations(KERALA)).locations).toEqual([]);
  });

  it('starts and updates my own sharing', async () => {
    expect((await toliApi.shareLocation(KERALA, { lat: 9.5, lon: 76.32, for: '1h' })).sharing.until).toEqual(expect.any(String));
    await expect(toliApi.shareLocation(KERALA, { lat: 9.5, lon: 76.32, for: 'trip' })).resolves.toBeTruthy();
    await loginAs('u_ananya');
    await expect(toliApi.shareLocation(KERALA, { lat: 9.5, lon: 76.32 })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('keeps notes in order and my own Potli to myself', async () => {
    expect((await toliApi.notes(KERALA)).notes.map((n) => n.day)).toEqual([null, 1]);
    expect((await toliApi.potli(KERALA)).mine.map((i) => i.text)).toEqual(['Charger']);
    await loginAs('u_ananya');
    const hers = await toliApi.potli(KERALA);
    expect(hers.group.map((i) => i.text)).toEqual(['First-aid kit', 'Speaker']);
    expect(JSON.stringify(hers)).not.toContain('Charger');
    await expect(toliApi.claim(KERALA, hers.group[0].id)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await toliApi.claim(KERALA, hers.group[1].id)).item.claimedBy?.id).toBe('u_ananya');
  });

  it('shows a family only the first name and the latest check-in', async () => {
    const mine = await kushalApi.mine();
    expect(mine.contacts.map((c) => c.name)).toEqual(['Maa']);
    await kushalApi.checkIn({ lat: 9.4935, lon: 76.319, note: 'All well' });
    const token = mine.contacts[0].link.split('/').pop()!;
    const { kushal } = await kushalApi.view(token);
    expect(Object.keys(kushal)).toEqual(['traveller', 'latest']);
    expect(kushal).toMatchObject({ traveller: 'Demo', latest: { place: 'near Alappuzha Beach', note: 'All well', position: { lat: 9.49, lon: 76.32 } } });
    await kushalApi.revoke(mine.contacts[0].id);
    await expect(kushalApi.view(token)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
