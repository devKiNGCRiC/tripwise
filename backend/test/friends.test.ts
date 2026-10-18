/**
 * friends.test.ts — friend requests by @username, invite links, removing and blocking, and
 * the anti-spam limits.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { clearTestDb, startTestDb, stopTestDb } from './helpers/db.js';
import { fakeChain } from './helpers/fakeAi.js';
import { quickUser, signUp } from './helpers/auth.js';
import { befriend, friendsAs } from './helpers/social.js';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let app: Express;
beforeEach(() => {
  app = createApp({ ai: fakeChain(), now: () => new Date('2026-10-19T10:00:00Z') });
});

/** Three travellers. */
async function people() {
  const asha = await signUp(app, 'asha@x.com', 'Asha');
  const ravi = await signUp(app, 'ravi@x.com', 'Ravi');
  const zoya = await signUp(app, 'zoya@x.com', 'Zoya');
  return { asha, ravi, zoya };
}

describe('friend requests', () => {
  it('are sent by @username, seen by the other person and accepted', async () => {
    const { asha, ravi } = await people();
    const sent = await friendsAs(app, asha.token).request(ravi.username.toUpperCase());
    expect(sent.status).toBe(200);
    expect((await friendsAs(app, asha.token).list()).body.sent).toHaveLength(1);

    const incoming = (await friendsAs(app, ravi.token).list()).body.incoming;
    expect(incoming).toHaveLength(1);
    expect(incoming[0].user).toMatchObject({ name: 'Asha', username: asha.username, trips: 0 });

    expect((await friendsAs(app, ravi.token).accept(incoming[0].id)).status).toBe(200);
    expect((await friendsAs(app, asha.token).list()).body.friends.map((f: { name: string }) => f.name)).toEqual(['Ravi']);
    expect((await friendsAs(app, ravi.token).list()).body.friends.map((f: { name: string }) => f.name)).toEqual(['Asha']);
  });

  it('become friendship at once when both ask', async () => {
    const { asha, ravi } = await people();
    await friendsAs(app, asha.token).request(ravi.username);
    const back = await friendsAs(app, ravi.token).request(asha.username);
    expect(back.status).toBe(200);
    expect((await friendsAs(app, asha.token).list()).body.friends).toHaveLength(1);
  });

  it('give 404 for unknown names and yourself, 409 when already friends', async () => {
    const { asha, ravi } = await people();
    const unknown = await friendsAs(app, asha.token).request('nobody_here');
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.message).toBe('No traveller with that username');
    expect((await friendsAs(app, asha.token).request(asha.username)).status).toBe(404);
    await befriend(app, asha, ravi);
    const again = await friendsAs(app, asha.token).request(ravi.username);
    expect(again.status).toBe(409);
    expect(again.body.error.message).toBe("You're already friends");
  });

  it('can be declined or cancelled', async () => {
    const { asha, ravi, zoya } = await people();
    await friendsAs(app, asha.token).request(ravi.username);
    const toRavi = (await friendsAs(app, ravi.token).list()).body.incoming[0];
    expect((await friendsAs(app, ravi.token).decline(toRavi.id)).status).toBe(204);
    await friendsAs(app, asha.token).request(zoya.username);
    const mine = (await friendsAs(app, asha.token).list()).body.sent[0];
    // Only the sender can cancel, only the receiver can accept.
    expect((await friendsAs(app, zoya.token).cancel(mine.id)).status).toBe(404);
    expect((await friendsAs(app, asha.token).accept(mine.id)).status).toBe(404);
    expect((await friendsAs(app, asha.token).cancel(mine.id)).status).toBe(204);
    expect((await friendsAs(app, zoya.token).list()).body.incoming).toEqual([]);
  });

  it('stop at 20 waiting requests', async () => {
    const asha = await quickUser('Asha');
    for (let i = 0; i < 20; i++) {
      const other = await quickUser(`Person ${i}`);
      expect((await friendsAs(app, asha.token).request(other.username)).status).toBe(200);
    }
    const last = await quickUser('Last One');
    const res = await friendsAs(app, asha.token).request(last.username);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('QUOTA_EXCEEDED');
  });
});

describe('removing and blocking', () => {
  it('remove a friend', async () => {
    const { asha, ravi } = await people();
    await befriend(app, asha, ravi);
    expect((await friendsAs(app, asha.token).remove(ravi.id)).status).toBe(204);
    expect((await friendsAs(app, ravi.token).list()).body.friends).toEqual([]);
  });

  it('blocking ends the friendship and makes you invisible to them', async () => {
    const { asha, ravi } = await people();
    await befriend(app, asha, ravi);
    expect((await friendsAs(app, asha.token).block(ravi.id)).status).toBe(204);
    expect((await friendsAs(app, asha.token).list()).body.friends).toEqual([]);
    expect((await friendsAs(app, ravi.token).card(asha.username)).status).toBe(404);
    expect((await friendsAs(app, ravi.token).request(asha.username)).status).toBe(404);
  });
});

describe('username cards', () => {
  it('show a card and how we are related', async () => {
    const { asha, ravi } = await people();
    const res = await friendsAs(app, asha.token).card(ravi.username);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ card: { name: 'Ravi', username: ravi.username }, relation: 'none' });
  });

  it('hide people whose passport is Only me (unless already friends)', async () => {
    const { asha, ravi, zoya } = await people();
    await befriend(app, ravi, zoya);
    await friendsAs(app, ravi.token).setPrivacy({ passport: 'private' });
    expect((await friendsAs(app, asha.token).card(ravi.username)).status).toBe(404);
    expect((await friendsAs(app, zoya.token).card(ravi.username)).status).toBe(200);
  });
});

describe('invite links', () => {
  it('make friends straight away, and a new link retires the old one', async () => {
    const { asha, ravi, zoya } = await people();
    const code = (await friendsAs(app, asha.token).profile()).body.profile.inviteCode;
    const seen = await friendsAs(app, ravi.token).invite(code);
    expect(seen.body.card.name).toBe('Asha');
    const accepted = await friendsAs(app, ravi.token).acceptInvite(code);
    expect(accepted.status).toBe(200);
    expect(accepted.body.friend.name).toBe('Asha');
    expect((await friendsAs(app, asha.token).list()).body.friends).toHaveLength(1);

    const fresh = (await friendsAs(app, asha.token).newCode()).body.inviteCode;
    expect(fresh).not.toBe(code);
    expect((await friendsAs(app, zoya.token).invite(code)).status).toBe(404);
    expect((await friendsAs(app, zoya.token).acceptInvite(fresh)).status).toBe(200);
  });

  it("can't be used on yourself", async () => {
    const { asha } = await people();
    const code = (await friendsAs(app, asha.token).profile()).body.profile.inviteCode;
    const res = await friendsAs(app, asha.token).acceptInvite(code);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("That's your own invite link");
  });
});
