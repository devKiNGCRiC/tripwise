/**
 * tolis.test.ts — Tolis (groups planning a trip together):
 *   - creating one (the creator is the Sutradhar; college/office start in announcement mode)
 *   - only members see a Toli — everyone else gets 404, as for a Toli that doesn't exist
 *   - invite links (preview, join once, a new link retires the old one) and adding friends
 *     by @username (not strangers, never blocked people)
 *   - roles: only the Sutradhar changes them; passing the Sutradhar role on; the Sutradhar
 *     can't leave before passing it on; members can leave; leaders can remove
 *   - a phone number shared with the Toli only; the 500-member limit; activity written
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Block, Friendship, Toli, ToliActivity } from '../src/db/models/index.js';
import { pairKey } from '../src/services/social.js';
import { quickUser } from './helpers/auth.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const NOW = new Date('2026-10-19T10:00:00Z');
const app = createApp({ ai: fakeChain(), now: () => NOW, appUrl: 'https://tripwise.test' });

/** A request as someone. */
const as = (token: string) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${token}`),
  post: (path: string, body: object = {}) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${token}`).send(body),
  del: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${token}`),
});

/** Make two people friends. */
const befriend = (a: string, b: string) => Friendship.create({ pair: pairKey(a, b), requester: a, recipient: b, status: 'accepted', createdAt: NOW });

/** Asha's Toli, with Kabir joined through the invite link. */
async function ashaAndKabir(type = 'friends') {
  const asha = await quickUser('Asha');
  const kabir = await quickUser('Kabir');
  const created = await as(asha.token).post('/tolis', { name: 'Goa Toli', type });
  const id = created.body.toli.id as string;
  const token = (created.body.toli.inviteUrl as string).split('/').pop()!;
  await as(kabir.token).post(`/toli-invites/${token}/join`);
  return { asha, kabir, id, token };
}

describe('creating and seeing Tolis', () => {
  it('makes the creator the Sutradhar, with an invite link for leaders', async () => {
    const asha = await quickUser('Asha');
    const res = await as(asha.token).post('/tolis', { name: 'Goa Toli', type: 'friends' });
    expect(res.status).toBe(201);
    expect(res.body.toli).toMatchObject({ name: 'Goa Toli', type: 'friends', announcementMode: false, memberCount: 1, me: { role: 'sutradhar', canPost: true } });
    expect(res.body.toli.inviteUrl).toMatch(/^https:\/\/tripwise\.test\/toli\/join\/[A-Za-z0-9_-]{16,}$/);
  });

  it('starts college and office Tolis in announcement mode, and checks the name', async () => {
    const asha = await quickUser('Asha');
    expect((await as(asha.token).post('/tolis', { name: 'Batch of 26', type: 'college' })).body.toli.announcementMode).toBe(true);
    expect((await as(asha.token).post('/tolis', { name: 'x', type: 'friends' })).status).toBe(400);
    expect((await as(asha.token).post('/tolis', { name: 'School', type: 'school' })).status).toBe(400);
  });

  it('shows a Toli only to its members', async () => {
    const { asha, id } = await ashaAndKabir();
    const zoya = await quickUser('Zoya');
    expect((await as(asha.token).get('/tolis')).body.tolis.map((t: { id: string }) => t.id)).toEqual([id]);
    expect((await as(zoya.token).get('/tolis')).body.tolis).toEqual([]);
    expect((await as(zoya.token).get(`/tolis/${id}`)).status).toBe(404);
    expect((await as(zoya.token).get('/tolis/not-an-id')).status).toBe(404);
  });

  it('lets leaders rename it and switch announcement mode, not Sahyatris', async () => {
    const { asha, kabir, id } = await ashaAndKabir();
    expect((await as(kabir.token).patch(`/tolis/${id}`, { announcementMode: true })).status).toBe(403);
    const res = await as(asha.token).patch(`/tolis/${id}`, { name: 'Goa 2026', announcementMode: true });
    expect(res.body.toli).toMatchObject({ name: 'Goa 2026', announcementMode: true });
  });
});

describe('joining', () => {
  it('previews an invite and joins once', async () => {
    const { kabir, id, token } = await ashaAndKabir();
    const preview = await as(kabir.token).get(`/toli-invites/${token}`);
    expect(preview.body.invite).toMatchObject({ toliId: id, name: 'Goa Toli', memberCount: 2, sutradhar: { name: 'Asha' } });
    await as(kabir.token).post(`/toli-invites/${token}/join`);
    expect((await Toli.findById(id))!.members).toHaveLength(2);
    // Sahyatris don't see the invite link.
    expect((await as(kabir.token).get(`/tolis/${id}`)).body.toli.inviteUrl).toBeUndefined();
  });

  it('retires the old link when a leader makes a new one', async () => {
    const { asha, id, token } = await ashaAndKabir();
    const fresh = await as(asha.token).post(`/tolis/${id}/invite`);
    expect(fresh.body.inviteUrl).not.toContain(token);
    const zoya = await quickUser('Zoya');
    expect((await as(zoya.token).get(`/toli-invites/${token}`)).status).toBe(404);
    expect((await as(zoya.token).post(`/toli-invites/${token}/join`)).status).toBe(404);
  });

  it('keeps out people who blocked, or were blocked by, a member', async () => {
    const { kabir, token } = await ashaAndKabir();
    const zoya = await quickUser('Zoya');
    await Block.create({ blocker: kabir.id, blocked: zoya.id });
    expect((await as(zoya.token).get(`/toli-invites/${token}`)).status).toBe(404);
    expect((await as(zoya.token).post(`/toli-invites/${token}/join`)).status).toBe(404);
  });

  it('adds friends by @username, but not strangers', async () => {
    const { asha, id } = await ashaAndKabir();
    const zoya = await quickUser('Zoya');
    const dev = await quickUser('Dev');
    await befriend(asha.id, zoya.id);
    expect((await as(asha.token).post(`/tolis/${id}/members`, { username: zoya.username })).status).toBe(200);
    expect((await as(asha.token).post(`/tolis/${id}/members`, { username: dev.username })).status).toBe(403);
  });

  it('stops at 500 Sahyatris', async () => {
    const { id, token } = await ashaAndKabir();
    const toli = await Toli.findById(id);
    const filler = Array.from({ length: 498 }, () => ({ userId: new Toli()._id, role: 'sahyatri', joinedAt: NOW }));
    toli!.members.push(...(filler as never[]));
    await toli!.save();
    const late = await quickUser('Late');
    const res = await as(late.token).post(`/toli-invites/${token}/join`);
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'CONFLICT', message: 'This Toli is full (500 Sahyatris).' });
  });
});

describe('roles, leaving and removing', () => {
  it('lets only the Sutradhar change roles, and pass the Sutradhar role on', async () => {
    const { asha, kabir, id } = await ashaAndKabir();
    const zoya = await quickUser('Zoya');
    await befriend(asha.id, zoya.id);
    await as(asha.token).post(`/tolis/${id}/members`, { username: zoya.username });
    expect((await as(asha.token).patch(`/tolis/${id}/members/${kabir.id}`, { role: 'sah' })).status).toBe(200);
    // A Sah-Sutradhar can't hand out roles.
    expect((await as(kabir.token).patch(`/tolis/${id}/members/${zoya.id}`, { role: 'sah' })).status).toBe(403);
    await as(asha.token).patch(`/tolis/${id}/members/${kabir.id}`, { role: 'sutradhar' });
    const view = (await as(asha.token).get(`/tolis/${id}`)).body.toli;
    expect(view.me.role).toBe('sah');
    expect(view.members.find((m: { id: string }) => m.id === kabir.id).role).toBe('sutradhar');
  });

  it("won't let the Sutradhar leave before passing the role on", async () => {
    const { asha, kabir, id } = await ashaAndKabir();
    const res = await as(asha.token).del(`/tolis/${id}/members/${asha.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Pass the Sutradhar role to someone first.');
    expect((await as(kabir.token).del(`/tolis/${id}/members/${asha.id}`)).status).toBe(403);
  });

  it('lets Sahyatris leave and leaders remove them', async () => {
    const { asha, kabir, id } = await ashaAndKabir();
    expect((await as(kabir.token).del(`/tolis/${id}/members/${kabir.id}`)).status).toBe(204);
    expect((await as(kabir.token).get(`/tolis/${id}`)).status).toBe(404);
    const zoya = await quickUser('Zoya');
    await befriend(asha.id, zoya.id);
    await as(asha.token).post(`/tolis/${id}/members`, { username: zoya.username });
    expect((await as(asha.token).del(`/tolis/${id}/members/${zoya.id}`)).status).toBe(204);
  });
});

describe('phone numbers and activity', () => {
  it('shares a phone number with the Toli only, and can hide it again', async () => {
    const { asha, kabir, id } = await ashaAndKabir();
    expect((await as(kabir.token).patch(`/tolis/${id}/me`, { phone: '12345' })).status).toBe(400);
    await as(kabir.token).patch(`/tolis/${id}/me`, { phone: '+91 98765 43210' });
    const kabirCard = () => as(asha.token).get(`/tolis/${id}`).then((r) => r.body.toli.members.find((m: { id: string }) => m.id === kabir.id));
    expect((await kabirCard()).phone).toBe('+919876543210');
    await as(kabir.token).patch(`/tolis/${id}/me`, { phone: null });
    expect((await kabirCard()).phone).toBeUndefined();
  });

  it('records what happened', async () => {
    const { kabir, id } = await ashaAndKabir();
    await as(kabir.token).del(`/tolis/${id}/members/${kabir.id}`);
    const types = (await ToliActivity.find({ toliId: id }).sort({ at: 1, _id: 1 }).lean()).map((a) => a.type);
    expect(types).toEqual(['created', 'joined', 'left']);
  });
});
