/**
 * social.ts (test helper) — short calls for the friends tests.
 */
import request from 'supertest';
import type { Express } from 'express';

/** Friend actions as one signed-in traveller. */
export function friendsAs(app: Express, token: string) {
  const auth = { Authorization: `Bearer ${token}` };
  return {
    list: () => request(app).get('/api/friends').set(auth),
    request: (username: string) => request(app).post('/api/friends/requests').set(auth).send({ username }),
    accept: (id: string) => request(app).post(`/api/friends/requests/${id}/accept`).set(auth),
    decline: (id: string) => request(app).post(`/api/friends/requests/${id}/decline`).set(auth),
    cancel: (id: string) => request(app).delete(`/api/friends/requests/${id}`).set(auth),
    remove: (userId: string) => request(app).delete(`/api/friends/${userId}`).set(auth),
    block: (userId: string) => request(app).post('/api/blocks').set(auth).send({ userId }),
    card: (username: string) => request(app).get(`/api/users/${username}/card`).set(auth),
    invite: (code: string) => request(app).get(`/api/invites/${code}`).set(auth),
    acceptInvite: (code: string) => request(app).post(`/api/invites/${code}/accept`).set(auth),
    newCode: () => request(app).post('/api/me/invite-code').set(auth),
    profile: () => request(app).get('/api/me/profile').set(auth),
    setPrivacy: (privacy: object) => request(app).patch('/api/me/profile').set(auth).send({ privacy }),
    passportOf: (username: string) => request(app).get(`/api/users/${username}/passport`).set(auth),
  };
}

/** Make two signed-up travellers friends (a asks, b accepts). */
export async function befriend(app: Express, a: { token: string }, b: { token: string; username: string }) {
  await friendsAs(app, a.token).request(b.username);
  const incoming = (await friendsAs(app, b.token).list()).body.incoming;
  // b answers a's request.
  await friendsAs(app, b.token).accept(incoming[0].id);
}
