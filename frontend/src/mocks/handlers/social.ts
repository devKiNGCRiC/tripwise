/**
 * social.ts (mock) — the demo API for everything around the traveller: profile and photo,
 * account safety (password, sign out everywhere, forgot/reset, delete), passports (mine and
 * public), trip journals with photos, and friends (requests, blocks, invite links).
 *
 * Same rules, shapes and error messages as the real backend (backend/src/routes/*), so the
 * website behaves identically without a server.
 *   - Mock reset links: "forgot password" prints the link in the browser console; the token
 *     "demo-reset" always works for the demo account.
 */
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import type { Card, Journal, Profile, ProfilePatch, Relation } from '@/lib/api/types';
import { buildPassport } from '../data/passport';
import { dayFromToday, type MockJournal } from '../data/social';
import type { MockUser } from '../data/users';
import { db, mockInviteCode, publicUser, saveTrips, session } from '../db';
import { currentUser, errorResponse, latency } from './shared';

/** Words nobody may take as a username. */
const RESERVED = new Set(['admin', 'tripwise', 'passport', 'join', 'api', 'login', 'signup', 'u', 'me', 'help', 'support']);
/** Accepted image types for photos. */
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
/** Reset tokens handed out by "forgot password" (token → user id). */
const resetTokens = new Map<string, string>([['demo-reset', 'u_demo']]);

/** "Please log in" for every protected call. */
const needLogin = () => errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
/** Today, as the passport counts it. */
const today = () => dayFromToday(0);

/** A user's own full profile. */
function profileOf(user: MockUser): Profile {
  return {
    ...publicUser(user),
    bio: user.bio,
    travellerType: user.travellerType,
    homeCity: user.homeCity,
    preferences: user.preferences,
    privacy: user.privacy,
    theme: user.theme,
    inviteCode: user.inviteCode,
  };
}

/** Why a username can't be used, or null. */
function usernameProblem(name: string): string | null {
  if (name.length < 3 || name.length > 20) return 'Usernames are 3 to 20 characters';
  if (/^[0-9]/.test(name)) return "Usernames can't start with a number";
  if (!/^[a-z_][a-z0-9_]{2,19}$/.test(name)) return 'Use only letters, numbers and _';
  if (RESERVED.has(name)) return "That username isn't available";
  return null;
}

/** The record joining two people, if any. */
const linkBetween = (a: string, b: string) => db.friendships.find((f) => (f.requester === a && f.recipient === b) || (f.requester === b && f.recipient === a));
/** Has either blocked the other? */
const blockedBetween = (a: string, b: string) => db.blocks.some((x) => (x.blocker === a && x.blocked === b) || (x.blocker === b && x.blocked === a));

/** How the viewer is connected to someone. */
function relation(viewerId: string | null, ownerId: string): Relation {
  if (!viewerId) return 'none';
  if (viewerId === ownerId) return 'self';
  if (blockedBetween(viewerId, ownerId)) return 'blocked';
  const link = linkBetween(viewerId, ownerId);
  if (!link) return 'none';
  if (link.status === 'accepted') return 'friend';
  return link.requester === viewerId ? 'pending-out' : 'pending-in';
}

/** May the viewer see this passport? */
function canSeePassport(viewerId: string | null, owner: MockUser): boolean {
  const rel = relation(viewerId, owner.id);
  if (rel === 'self') return true;
  if (rel === 'blocked') return false;
  if (owner.privacy.passport === 'everyone') return true;
  if (owner.privacy.passport === 'friends') return rel === 'friend';
  return false;
}

/** May the viewer see this owner's journals and photos? */
const canSeeJournalOf = (viewerId: string | null, owner: MockUser) => viewerId === owner.id || (owner.privacy.showJournal && canSeePassport(viewerId, owner));

/** The viewer's id from an optional Bearer token. */
const viewerOf = (request: Request) => currentUser(request)?.id ?? null;

/** A traveller's card. */
function cardOf(user: MockUser): Card {
  const shown = publicUser(user);
  const trips = db.itineraries.filter((t) => t.ownerId === user.id && t.request.endDate < today()).length;
  return { id: user.id, name: user.name, username: user.username, ...(shown.avatarUrl ? { avatarUrl: shown.avatarUrl } : {}), travellerType: user.travellerType, trips };
}

/** Build someone's passport, as seen by `viewerId`. */
function passportOf(owner: MockUser, opts: { includeUpcoming: boolean; includeJournal: boolean; viewerId: string | null }) {
  const shown = publicUser(owner);
  return buildPassport({
    cover: {
      name: owner.name,
      username: owner.username,
      ...(shown.avatarUrl ? { avatarUrl: shown.avatarUrl } : {}),
      bio: owner.bio,
      travellerType: owner.travellerType,
      homeCity: owner.homeCity,
      joined: owner.createdAt,
      theme: owner.theme,
    },
    trips: db.itineraries
      .filter((t) => t.ownerId === owner.id)
      .map((t) => ({ id: t.id, destination: t.request.destination, startDate: t.request.startDate, endDate: t.request.endDate, travellers: t.request.travellers, region: t.region ?? null })),
    journals: db.journals.filter((j) => j.ownerId === owner.id),
    destinations: db.destinations,
    today: today(),
    includeUpcoming: opts.includeUpcoming,
    includeJournal: opts.includeJournal,
    photoUrl: (id) => photoUrl(id, opts.viewerId),
  });
}

/**
 * A photo link for a viewer. The real API signs these (so they work inside <img>, which
 * sends no login); the demo just names the viewer.
 */
const photoUrl = (photoId: string, viewerId: string | null) => `/api/photos/${photoId}?v=${viewerId ?? 'anon'}`;

/** A journal as the website sees it. */
function publicJournal(itineraryId: string, journal: MockJournal | undefined, viewerId: string): Journal {
  return {
    itineraryId,
    rating: journal?.rating ?? null,
    memory: journal?.memory ?? '',
    photos: (journal?.photos ?? []).map((p) => ({ ...p, url: photoUrl(p.id, viewerId) })),
    updatedAt: journal?.updatedAt ?? null,
  };
}

/** The person behind a username, if the viewer may find them (else null). */
function findable(viewerId: string, username: string): MockUser | null {
  const other = db.users.find((u) => u.username === username.trim().toLowerCase());
  if (!other || other.id === viewerId || other.blocked) return null;
  const rel = relation(viewerId, other.id);
  if (rel === 'blocked') return null;
  if (other.privacy.passport === 'private' && rel === 'none') return null;
  return other;
}

/** Make two people friends (replacing any pending request). */
function makeFriends(a: string, b: string) {
  const link = linkBetween(a, b);
  if (link) link.status = 'accepted';
  else db.friendships.push({ id: `fr_${crypto.randomUUID().slice(0, 8)}`, requester: a, recipient: b, status: 'accepted', createdAt: new Date().toISOString() });
}

/** Read a request body as bytes and check it's an accepted image under `max` bytes. */
async function readImage(request: Request, max: number): Promise<Blob | null> {
  const blob = await request.blob();
  const type = request.headers.get('Content-Type') ?? blob.type;
  if (!IMAGE_TYPES.includes(type) || blob.size === 0 || blob.size > max) return null;
  return new Blob([await blob.arrayBuffer()], { type });
}

export const socialHandlers = [
  // ── Profile ──
  http.get(apiUrl('/me/profile'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    return HttpResponse.json({ profile: profileOf(user) });
  }),

  http.patch(apiUrl('/me/profile'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const patch = (await request.json()) as ProfilePatch;
    if (patch.username !== undefined) {
      const wanted = patch.username.trim().toLowerCase();
      if (wanted !== user.username) {
        const problem = usernameProblem(wanted);
        if (problem) return errorResponse(400, 'VALIDATION', problem);
        if (user.usernameChangedAt && Date.now() - Date.parse(user.usernameChangedAt) < 86_400_000) return errorResponse(400, 'VALIDATION', 'You can change your username once a day');
        if (db.users.some((u) => u.username === wanted)) return errorResponse(409, 'VALIDATION', 'That username is taken');
        user.username = wanted;
        user.usernameChangedAt = new Date().toISOString();
      }
    }
    if (patch.bio !== undefined && patch.bio.length > 160) return errorResponse(400, 'VALIDATION', 'Keep your bio under 160 characters');
    if (patch.name !== undefined) user.name = patch.name.trim() || user.name;
    if (patch.bio !== undefined) user.bio = patch.bio.trim();
    if (patch.travellerType !== undefined) user.travellerType = patch.travellerType;
    if (patch.homeCity !== undefined) user.homeCity = patch.homeCity.trim().slice(0, 80);
    if (patch.theme !== undefined) user.theme = patch.theme;
    if (patch.preferences) user.preferences = { ...user.preferences, ...patch.preferences };
    if (patch.privacy) user.privacy = { ...user.privacy, ...patch.privacy };
    return HttpResponse.json({ profile: profileOf(user) });
  }),

  // ── Profile photo ──
  http.put(apiUrl('/me/avatar'), async ({ request }) => {
    const user = currentUser(request);
    if (!user) return needLogin();
    const image = await readImage(request, 300 * 1024);
    if (!image) return errorResponse(400, 'VALIDATION', 'Please choose a JPG, PNG or WebP image under 300 KB');
    db.avatars[user.id] = image;
    user.avatarVersion = Math.max(Date.now(), (user.avatarVersion ?? 0) + 1);
    return HttpResponse.json({ profile: profileOf(user) });
  }),

  http.delete(apiUrl('/me/avatar'), async ({ request }) => {
    const user = currentUser(request);
    if (!user) return needLogin();
    delete db.avatars[user.id];
    delete user.avatarVersion;
    return HttpResponse.json({ profile: profileOf(user) });
  }),

  http.get(apiUrl('/avatars/:userId'), ({ params }) => {
    const image = db.avatars[String(params.userId)];
    if (!image) return errorResponse(404, 'NOT_FOUND', "We couldn't find that.");
    return new HttpResponse(image, { headers: { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  }),

  // ── Account safety ──
  http.post(apiUrl('/me/password'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    if (body.currentPassword !== user.password) return errorResponse(400, 'VALIDATION', "Your current password isn't right");
    if (!body.newPassword || body.newPassword.length < 8) return errorResponse(400, 'VALIDATION', 'Passwords need at least 8 characters');
    user.password = body.newPassword;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(apiUrl('/auth/logout-all'), async ({ request }) => {
    await latency();
    if (!currentUser(request)) return needLogin();
    session.clear();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(apiUrl('/me'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    if (body.password !== user.password) return errorResponse(400, 'VALIDATION', "That password isn't right");
    // Everything that was theirs goes.
    db.users = db.users.filter((u) => u.id !== user.id);
    db.itineraries = db.itineraries.filter((t) => t.ownerId !== user.id);
    db.journals = db.journals.filter((j) => j.ownerId !== user.id);
    for (const [id, photo] of Object.entries(db.photos)) if (photo.ownerId === user.id) delete db.photos[id];
    delete db.avatars[user.id];
    db.friendships = db.friendships.filter((f) => f.requester !== user.id && f.recipient !== user.id);
    db.blocks = db.blocks.filter((b) => b.blocker !== user.id && b.blocked !== user.id);
    saveTrips();
    session.clear();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(apiUrl('/auth/forgot'), async ({ request }) => {
    await latency();
    const { email } = (await request.json()) as { email?: string };
    const user = db.users.find((u) => u.email === (email ?? '').trim().toLowerCase());
    if (user) {
      const token = crypto.randomUUID().replace(/-/g, '');
      resetTokens.set(token, user.id);
      // The demo has no email: the link goes to the console instead.
      console.info(`[mock mail] reset link for ${user.email}: ${window.location.origin}/reset-password/${token}`);
    }
    return HttpResponse.json({ ok: true });
  }),

  http.post(apiUrl('/auth/reset'), async ({ request }) => {
    await latency();
    const { token, password } = (await request.json()) as { token?: string; password?: string };
    const user = db.users.find((u) => u.id === resetTokens.get(token ?? ''));
    if (!user) return errorResponse(400, 'VALIDATION', 'This reset link has expired. Ask for a new one.');
    if (!password || password.length < 8) return errorResponse(400, 'VALIDATION', 'Passwords need at least 8 characters');
    user.password = password;
    resetTokens.delete(token ?? '');
    return HttpResponse.json({ ok: true });
  }),

  // ── Passports ──
  http.get(apiUrl('/me/passport'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    return HttpResponse.json({ passport: passportOf(user, { includeUpcoming: true, includeJournal: true, viewerId: user.id }) });
  }),

  http.get(apiUrl('/users/:username/passport'), async ({ request, params }) => {
    await latency();
    const owner = db.users.find((u) => u.username === String(params.username).toLowerCase());
    const viewer = viewerOf(request);
    if (!owner || owner.blocked || !canSeePassport(viewer, owner)) return errorResponse(404, 'NOT_FOUND', 'This passport is private');
    return HttpResponse.json({ passport: passportOf(owner, { includeUpcoming: false, includeJournal: canSeeJournalOf(viewer, owner), viewerId: viewer }), relation: relation(viewer, owner.id) });
  }),

  // ── Journals ──
  http.get(apiUrl('/itineraries/:id/journal'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const trip = db.itineraries.find((t) => t.id === params.id && t.ownerId === user.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    return HttpResponse.json({ journal: publicJournal(trip.id, db.journals.find((j) => j.itineraryId === trip.id), user.id) });
  }),

  http.put(apiUrl('/itineraries/:id/journal'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const trip = db.itineraries.find((t) => t.id === params.id && t.ownerId === user.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    if (trip.request.endDate >= today()) return errorResponse(400, 'VALIDATION', "You can write about this trip once it's over");
    const body = (await request.json()) as { rating?: number | null; memory?: string };
    if (body.rating !== null && body.rating !== undefined && (body.rating < 1 || body.rating > 5)) return errorResponse(400, 'VALIDATION', 'Rate it from 1 to 5 diyas');
    if ((body.memory ?? '').length > 1000) return errorResponse(400, 'VALIDATION', 'Keep your memory under 1,000 characters');
    let journal = db.journals.find((j) => j.itineraryId === trip.id);
    if (!journal) db.journals.push((journal = { itineraryId: trip.id, ownerId: user.id, rating: null, memory: '', photos: [], updatedAt: '' }));
    journal.rating = body.rating ?? null;
    journal.memory = (body.memory ?? '').trim();
    journal.updatedAt = new Date().toISOString();
    return HttpResponse.json({ journal: publicJournal(trip.id, journal, user.id) });
  }),

  http.post(apiUrl('/itineraries/:id/journal/photos'), async ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return needLogin();
    const trip = db.itineraries.find((t) => t.id === params.id && t.ownerId === user.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    if (trip.request.endDate >= today()) return errorResponse(400, 'VALIDATION', "You can write about this trip once it's over");
    const image = await readImage(request, 1.5 * 1024 * 1024);
    if (!image) return errorResponse(400, 'VALIDATION', 'Please choose a JPG, PNG or WebP image under 1.5 MB');
    let journal = db.journals.find((j) => j.itineraryId === trip.id);
    if (!journal) db.journals.push((journal = { itineraryId: trip.id, ownerId: user.id, rating: null, memory: '', photos: [], updatedAt: '' }));
    if (journal.photos.length >= 6) return errorResponse(400, 'VALIDATION', 'A trip can have up to 6 photos');
    const url = new URL(request.url);
    const id = `ph_${crypto.randomUUID().slice(0, 12)}`;
    db.photos[id] = { ownerId: user.id, itineraryId: trip.id, blob: image };
    journal.photos.push({ id, width: Number(url.searchParams.get('width')) || 1, height: Number(url.searchParams.get('height')) || 1, alt: url.searchParams.get('alt') ?? '' });
    journal.updatedAt = new Date().toISOString();
    return HttpResponse.json({ journal: publicJournal(trip.id, journal, user.id) });
  }),

  http.delete(apiUrl('/itineraries/:id/journal/photos/:photoId'), async ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return needLogin();
    const trip = db.itineraries.find((t) => t.id === params.id && t.ownerId === user.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    const journal = db.journals.find((j) => j.itineraryId === trip.id);
    // Only a photo that is really in this journal is removed — never anyone else's.
    if (journal?.photos.some((p) => p.id === params.photoId)) {
      journal.photos = journal.photos.filter((p) => p.id !== params.photoId);
      delete db.photos[String(params.photoId)];
    }
    return HttpResponse.json({ journal: publicJournal(trip.id, journal, user.id) });
  }),

  http.get(apiUrl('/photos/:photoId'), ({ request, params }) => {
    const photo = db.photos[String(params.photoId)];
    const owner = photo ? db.users.find((u) => u.id === photo.ownerId) : undefined;
    // The viewer named in the link (as <img> sends no login), else the login sent with it.
    const named = new URL(request.url).searchParams.get('v');
    const viewer = named ? (named === 'anon' ? null : named) : viewerOf(request);
    if (!photo || !owner || !canSeeJournalOf(viewer, owner)) return errorResponse(404, 'NOT_FOUND', "We couldn't find that.");
    // Seeded photos are links to the destination pictures.
    if (photo.href) return Response.redirect(photo.href, 302);
    return new HttpResponse(photo.blob, { headers: { 'Content-Type': photo.blob!.type, 'Cache-Control': 'private, no-cache' } });
  }),

  // ── Friends ──
  http.get(apiUrl('/friends'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const mine = db.friendships.filter((f) => f.requester === user.id || f.recipient === user.id);
    const other = (f: (typeof mine)[number]) => db.users.find((u) => u.id === (f.requester === user.id ? f.recipient : f.requester));
    const asRequest = (f: (typeof mine)[number]) => {
      const person = other(f);
      return person ? [{ id: f.id, user: cardOf(person), createdAt: f.createdAt }] : [];
    };
    return HttpResponse.json({
      friends: mine
        .filter((f) => f.status === 'accepted')
        .flatMap((f) => (other(f) ? [cardOf(other(f)!)] : []))
        .sort((a, b) => a.name.localeCompare(b.name)),
      incoming: mine.filter((f) => f.status === 'pending' && f.recipient === user.id).flatMap(asRequest),
      sent: mine.filter((f) => f.status === 'pending' && f.requester === user.id).flatMap(asRequest),
    });
  }),

  http.post(apiUrl('/friends/requests'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const { username } = (await request.json()) as { username?: string };
    const other = findable(user.id, username ?? '');
    if (!other) return errorResponse(404, 'NOT_FOUND', 'No traveller with that username');
    const link = linkBetween(user.id, other.id);
    if (link?.status === 'accepted') return errorResponse(409, 'VALIDATION', "You're already friends");
    if (link && link.requester === other.id) {
      link.status = 'accepted';
      return HttpResponse.json({ relation: 'friend' });
    }
    if (!link) {
      if (db.friendships.filter((f) => f.requester === user.id && f.status === 'pending').length >= 20) {
        return errorResponse(429, 'QUOTA_EXCEEDED', "You've sent a lot of requests — try again tomorrow");
      }
      db.friendships.push({ id: `fr_${crypto.randomUUID().slice(0, 8)}`, requester: user.id, recipient: other.id, status: 'pending', createdAt: new Date().toISOString() });
    }
    return HttpResponse.json({ relation: 'pending-out' });
  }),

  http.post(apiUrl('/friends/requests/:id/accept'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const link = db.friendships.find((f) => f.id === params.id && f.status === 'pending' && f.recipient === user.id);
    const friend = link && db.users.find((u) => u.id === link.requester);
    if (!link || !friend) return errorResponse(404, 'NOT_FOUND', "We couldn't find that request.");
    link.status = 'accepted';
    return HttpResponse.json({ friend: cardOf(friend) });
  }),

  http.post(apiUrl('/friends/requests/:id/decline'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const index = db.friendships.findIndex((f) => f.id === params.id && f.status === 'pending' && f.recipient === user.id);
    if (index < 0) return errorResponse(404, 'NOT_FOUND', "We couldn't find that request.");
    db.friendships.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(apiUrl('/friends/requests/:id'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const index = db.friendships.findIndex((f) => f.id === params.id && f.status === 'pending' && f.requester === user.id);
    if (index < 0) return errorResponse(404, 'NOT_FOUND', "We couldn't find that request.");
    db.friendships.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(apiUrl('/friends/:userId'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    db.friendships = db.friendships.filter((f) => !((f.requester === user.id && f.recipient === params.userId) || (f.requester === params.userId && f.recipient === user.id)));
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(apiUrl('/blocks'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const { userId } = (await request.json()) as { userId?: string };
    if (!userId || userId === user.id || !db.users.some((u) => u.id === userId)) return errorResponse(404, 'NOT_FOUND', 'No traveller with that username');
    if (!db.blocks.some((b) => b.blocker === user.id && b.blocked === userId)) db.blocks.push({ blocker: user.id, blocked: userId });
    db.friendships = db.friendships.filter((f) => !((f.requester === user.id && f.recipient === userId) || (f.requester === userId && f.recipient === user.id)));
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(apiUrl('/blocks/:userId'), async ({ request, params }) => {
    const user = currentUser(request);
    if (!user) return needLogin();
    db.blocks = db.blocks.filter((b) => !(b.blocker === user.id && b.blocked === params.userId));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(apiUrl('/users/:username/card'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const other = findable(user.id, String(params.username));
    if (!other) return errorResponse(404, 'NOT_FOUND', 'No traveller with that username');
    return HttpResponse.json({ card: cardOf(other), relation: relation(user.id, other.id) });
  }),

  http.get(apiUrl('/invites/:code'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const owner = db.users.find((u) => u.inviteCode === params.code);
    if (!owner || blockedBetween(user.id, owner.id)) return errorResponse(404, 'NOT_FOUND', 'This invite link has expired');
    return HttpResponse.json({ card: cardOf(owner) });
  }),

  http.post(apiUrl('/invites/:code/accept'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const owner = db.users.find((u) => u.inviteCode === params.code);
    if (!owner || blockedBetween(user.id, owner.id)) return errorResponse(404, 'NOT_FOUND', 'This invite link has expired');
    if (owner.id === user.id) return errorResponse(400, 'VALIDATION', "That's your own invite link");
    makeFriends(owner.id, user.id);
    return HttpResponse.json({ friend: cardOf(owner) });
  }),

  http.post(apiUrl('/me/invite-code'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    user.inviteCode = mockInviteCode();
    return HttpResponse.json({ inviteCode: user.inviteCode });
  }),
];
