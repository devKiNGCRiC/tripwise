/**
 * tolis.ts (mock) — the Toli API for demo mode: Tolis and members, invites, suggestions
 * (Sujhav), polls, budget comfort, the chat (Chaupal) with raised hands (Anurodh), and the
 * activity feed. Same routes, shapes and error codes as the real API, and the same rules —
 * imported from the API's own `toliRules.ts` (`@toli-rules`), never re-written here.
 * Non-members get NOT_FOUND for everything about a Toli.
 */
import { http, HttpResponse } from 'msw';
import { balances, isUpiId } from '@lekha-rules';
import { applySujhav, budgetRange, canPost, defaultsForType, isLeader, tallyPoll, type DayLike, type SujhavChange, type ToliRole } from '@toli-rules';
import { apiUrl } from '@/lib/api/config';
import type { Anurodh, AnurodhAction, ChaupalMessage, Interest, NewMessage, NewPoll, Poll, Sujhav, Toli, ToliBudget, ToliPerson } from '@/lib/api/types';
import { seedPlaces } from '../data/destinations';
import type { MockMember, MockMessage, MockPoll, MockSujhav, MockToli } from '../data/tolis';
import type { MockUser } from '../data/users';
import { db, publicUser, saveTrips } from '../db';
import { currentUser, errorResponse, latency } from './shared';

/** The same answer for a missing Toli and one you're not in. */
const TOLI_NOT_FOUND = "This Toli isn't available.";
/** Most Sahyatris per Toli. */
const MAX_MEMBERS = 500;
/** Longest trip a suggestion may make. */
const MAX_DAYS = 14;
/** Default questions for each kind of poll. */
const QUESTION = { destination: 'Where shall we go?', tithi: 'When can you go?', transport: 'How shall we travel?' } as const;
/** How each way of travelling reads. */
const TRANSPORT = { train: 'Train', bus: 'Bus', flight: 'Flight', car: 'Road trip by car', bike: 'Bike ride' } as const;
/** Short month names. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Words for each kind of suggestion, for chat cards. */
const KIND_WORDS: Record<string, string> = {
  'add-stop': 'add a stop',
  'remove-stop': 'remove a stop',
  'swap-stop': 'swap a stop',
  'move-stop': 'move a stop',
  'retheme-day': 'change a day',
  'add-day': 'add a day',
  'change-transport': 'change transport',
};

/** Small unique ids. */
let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;
/** A fresh invite secret. */
const newToken = () => `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 22);
/** Now as ISO text. */
const nowIso = () => new Date().toISOString();
/** The website's address, for invite links. */
const inviteUrl = (token: string) => `${window.location.origin}/toli/join/${token}`;

/** 401 for a missing login. */
const needLogin = () => errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
/** 404 for anything about a Toli you're not in. */
const notMember = () => errorResponse(404, 'NOT_FOUND', TOLI_NOT_FOUND);
/** 403 for Sahyatris doing a leader's job. */
const leadersOnly = (message = 'Only the Sutradhar and Sah-Sutradhars can do that.') => errorResponse(403, 'FORBIDDEN', message);
/** 409 for a clash with the current state. */
const clash = (message: string) => errorResponse(409, 'CONFLICT', message);
/** 400 for a bad request. */
const invalid = (message: string) => errorResponse(400, 'VALIDATION', message);

/** A person for Toli features. */
export function personOf(userId: string): ToliPerson {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { id: userId, name: 'Former Sahyatri', username: '' };
  const shown = publicUser(user);
  return { id: user.id, name: user.name, username: user.username, ...(shown.avatarUrl ? { avatarUrl: shown.avatarUrl } : {}) };
}

/** The Toli and the caller's membership, or null. */
function membership(toliId: unknown, userId: string): { toli: MockToli; member: MockMember } | null {
  const toli = db.tolis.find((t) => t.id === toliId);
  const member = toli?.members.find((m) => m.userId === userId);
  return toli && member ? { toli, member } : null;
}

/** May this member write in Chaupal right now? */
const mayPost = (toli: MockToli, member: MockMember) => canPost({ role: member.role, postUntil: member.postUntil ?? null, oneMessage: member.oneMessage }, toli.announcementMode, nowIso());

/** Has this person blocked, or been blocked by, anyone in the Toli? */
const blockedWith = (toli: MockToli, userId: string) => db.blocks.some((b) => (b.blocker === userId && toli.members.some((m) => m.userId === b.blocked)) || (b.blocked === userId && toli.members.some((m) => m.userId === b.blocker)));

/** Add an event to the activity feed. */
function logEvent(toliId: string, actorId: string, type: string, data: Record<string, unknown> = {}) {
  db.toliEvents.push({ id: newId('ev'), toliId, actorId, type, data, at: nowIso() });
}

/** Post a trip card into the chat (once per card). */
function postCard(toliId: string, authorId: string, card: MockMessage['card'] & object) {
  const clientId = `card:${card.type}:${card.id}`;
  if (db.messages.some((m) => m.toliId === toliId && m.clientId === clientId)) return;
  db.messages.push({ id: newId('ms'), toliId, authorId, text: '', mentions: [], photoIds: [], card, clientId, createdAt: nowIso() });
}

/** The group budget (never anyone's own numbers). */
function groupBudget(toli: MockToli): ToliBudget['group'] {
  const entries = Object.fromEntries(Object.entries(db.toliBudgets).filter(([key]) => key.startsWith(`${toli.id}|`)).map(([key, range]) => [key.split('|')[1], range]));
  const result = budgetRange(entries, toli.members.map((m) => m.userId));
  return { answered: result.answered, members: toli.members.length, range: result.range, ...(result.closest ? { closest: result.closest } : {}) };
}

/** Members' saved interests, most common first (ties alphabetical), at most five. */
function favouriteInterests(toli: MockToli): Interest[] {
  const counts = new Map<Interest, number>();
  for (const m of toli.members) for (const i of db.users.find((u) => u.id === m.userId)?.preferences.interests ?? []) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([i]) => i);
}

/** Everyone's net position in a Toli's Lekha (group expenses and settlements). */
export function toliNet(toliId: string): Record<string, number> {
  return balances(
    db.toliExpenses.filter((e) => e.toliId === toliId && !e.personal && !e.deletedAt).map((e) => ({ paidBy: e.paidBy, parts: e.parts })),
    db.toliSettlements.filter((s) => s.toliId === toliId).map((s) => ({ from: s.from, to: s.to, amount: s.amount })),
  );
}

/** The Toli as `member` sees it. */
function toliView(toli: MockToli, member: MockMember): Toli {
  const range = groupBudget(toli).range;
  return {
    id: toli.id,
    name: toli.name,
    type: toli.type,
    announcementMode: toli.announcementMode,
    tripId: toli.tripId,
    choices: Object.fromEntries(Object.entries(toli.choices).filter(([, v]) => v)),
    me: { role: member.role, canPost: mayPost(toli, member), requestsOff: !!member.requestsOff, ...(member.phone ? { phone: member.phone } : {}), ...(member.upi ? { upi: member.upi } : {}) },
    members: toli.members.flatMap((m) => {
      const person = db.users.find((u) => u.id === m.userId);
      return person ? [{ ...personOf(m.userId), role: m.role, ...(m.phone ? { phone: m.phone } : {}), ...(m.upi ? { upi: m.upi } : {}) }] : [];
    }),
    memberCount: toli.members.length,
    planDefaults: { interests: favouriteInterests(toli), ...(range ? { budget: range[1] } : {}) },
    ...(isLeader(member.role) ? { inviteUrl: inviteUrl(toli.inviteToken) } : {}),
  };
}

/** A suggestion as `viewerId` sees it. */
function sujhavView(s: MockSujhav, viewerId: string): Sujhav {
  const votes = Object.values(s.votes);
  return {
    id: s.id,
    author: personOf(s.authorId),
    change: s.change,
    ...(s.note ? { note: s.note } : {}),
    up: votes.filter((v) => v > 0).length,
    down: votes.filter((v) => v < 0).length,
    myVote: s.votes[viewerId] ?? 0,
    status: s.status,
    ...(s.decidedBy ? { decidedBy: personOf(s.decidedBy), decidedAt: s.decidedAt } : {}),
    ...(s.reason ? { reason: s.reason } : {}),
    createdAt: s.createdAt,
  };
}

/** Is the poll still taking votes? */
const pollOpen = (p: MockPoll) => p.status === 'open' && (!p.closesAt || p.closesAt > nowIso());

/** A poll as `viewerId` sees it. */
function pollView(p: MockPoll, viewerId: string, toli: MockToli): Poll {
  const tally = tallyPoll(p.options, p.votes, toli.members.map((m) => m.userId));
  return {
    id: p.id,
    kind: p.kind,
    question: p.question,
    options: p.options.map((o) => {
      const d = o.destination ? db.destinations.find((x) => x.slug === o.destination) : undefined;
      const facts = d
        ? { slug: d.slug, bestMonths: d.bestMonths, avgDailyCost: d.avgDailyCost.amount, topPlaces: seedPlaces.filter((pl) => pl.destination === d.slug).sort((a, b) => b.fame - a.fame).slice(0, 3).map((pl) => pl.name) }
        : null;
      return { id: o.id, label: o.label, ...(o.start ? { start: o.start, end: o.end } : {}), ...(o.mode ? { mode: o.mode } : {}), ...(p.kind === 'destination' ? { facts } : {}) };
    }),
    multi: p.multi,
    ...(p.closesAt ? { closesAt: p.closesAt } : {}),
    status: pollOpen(p) ? 'open' : 'closed',
    ...(p.winner ? { winner: p.winner } : {}),
    counts: tally.counts,
    myVotes: p.votes[viewerId] ?? [],
    leading: tally.leading,
    notVoted: tally.notVoted.map(personOf),
    authorId: p.authorId,
    createdAt: p.createdAt,
  };
}

/** A chat message as `viewerId` sees it. */
function messageView(m: MockMessage, viewerId: string): ChaupalMessage {
  const reply = m.replyTo ? db.messages.find((x) => x.id === m.replyTo) : undefined;
  let title = '';
  if (m.card?.type === 'sujhav') title = `Suggestion: ${KIND_WORDS[db.sujhavs.find((s) => s.id === m.card!.id)?.change.kind ?? ''] ?? 'a change'}`;
  if (m.card?.type === 'poll') title = db.polls.find((p) => p.id === m.card!.id)?.question ?? '';
  if (m.card?.type === 'plan') title = db.itineraries.find((t) => t.id === m.card!.id)?.title ?? '';
  return {
    id: m.id,
    author: personOf(m.authorId),
    text: m.text,
    ...(reply ? { replyTo: { id: reply.id, text: reply.text.slice(0, 80), authorName: personOf(reply.authorId).name } } : {}),
    mentions: m.mentions,
    ...(m.card ? { card: { ...m.card, title } } : {}),
    photos: m.photoIds.map((id) => ({ id, url: `/api/photos/${id}?v=${viewerId}` })),
    clientId: m.clientId,
    createdAt: m.createdAt,
  };
}

/** A raised hand (`withReply`: for its asker only). */
function anurodhView(a: (typeof db.anurodhs)[number], withReply: boolean): Anurodh {
  return {
    id: a.id,
    user: personOf(a.userId),
    about: a.about,
    status: a.status,
    ...(a.grant ? { grant: a.grant } : {}),
    ...(withReply && a.reply ? { reply: a.reply } : {}),
    createdAt: a.createdAt,
  };
}

/** Lower-case letters and digits only, for comparing place names. */
const plain = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

/** "1–4 Dec" for a date range. */
function rangeLabel(start: string, end: string) {
  const [sd, sm, ed, em] = [Number(start.slice(8, 10)), MONTHS[Number(start.slice(5, 7)) - 1], Number(end.slice(8, 10)), MONTHS[Number(end.slice(5, 7)) - 1]];
  if (start === end) return `${sd} ${sm}`;
  return sm === em ? `${sd}–${ed} ${sm}` : `${sd} ${sm} – ${ed} ${em}`;
}

/** Whole days from start to end, inclusive. */
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;

/** Today's date (local), "YYYY-MM-DD". */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Run a handler for a logged-in member of the Toli in the URL. */
export async function asMember(request: Request, toliId: unknown, run: (user: MockUser, toli: MockToli, member: MockMember) => Response | Promise<Response>): Promise<Response> {
  await latency();
  const user = currentUser(request);
  if (!user) return needLogin();
  const found = membership(toliId, user.id);
  if (!found) return notMember();
  return run(user, found.toli, found.member);
}

export const toliHandlers = [
  // ── Tolis and members ──
  http.post(apiUrl('/tolis'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const body = (await request.json()) as { name?: string; type?: string; tripId?: string };
    const name = (body.name ?? '').trim();
    if (name.length < 2 || name.length > 60) return invalid('Give your Toli a name (2–60 characters).');
    if (!['friends', 'family', 'college', 'office'].includes(body.type ?? '')) return invalid('Pick the kind of trip: friends, family, college or office.');
    const type = body.type as MockToli['type'];
    const trip = body.tripId ? db.itineraries.find((t) => t.id === body.tripId && t.ownerId === user.id) : undefined;
    if (body.tripId && !trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    if (trip?.toliId) return clash('That trip already belongs to a Toli.');
    const toli: MockToli = {
      id: newId('t'),
      name,
      type,
      ...defaultsForType(type),
      tripId: trip?.id ?? null,
      inviteToken: newToken(),
      members: [{ userId: user.id, role: 'sutradhar', joinedAt: nowIso() }],
      choices: {},
      createdAt: nowIso(),
    };
    db.tolis.push(toli);
    if (trip) {
      trip.toliId = toli.id;
      saveTrips();
    }
    logEvent(toli.id, user.id, 'created', { name });
    return HttpResponse.json({ toli: toliView(toli, toli.members[0]) }, { status: 201 });
  }),

  http.get(apiUrl('/tolis'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const mine = db.tolis.filter((t) => t.members.some((m) => m.userId === user.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({
      tolis: mine.map((t) => {
        const member = t.members.find((m) => m.userId === user.id)!;
        const since = member.lastReadAt ?? member.joinedAt;
        return { ...toliView(t, member), unread: db.messages.filter((m) => m.toliId === t.id && m.authorId !== user.id && m.createdAt > since).length };
      }),
    });
  }),

  http.get(apiUrl('/tolis/:id'), ({ request, params }) => asMember(request, params.id, (_user, toli, member) => HttpResponse.json({ toli: toliView(toli, member) }))),

  http.patch(apiUrl('/tolis/:id'), ({ request, params }) =>
    asMember(request, params.id, async (_user, toli, member) => {
      if (!isLeader(member.role)) return leadersOnly();
      const body = (await request.json()) as { name?: string; announcementMode?: boolean };
      if (body.name !== undefined) toli.name = body.name.trim();
      if (body.announcementMode !== undefined) toli.announcementMode = body.announcementMode;
      return HttpResponse.json({ toli: toliView(toli, member) });
    }),
  ),

  http.post(apiUrl('/tolis/:id/invite'), ({ request, params }) =>
    asMember(request, params.id, (_user, toli, member) => {
      if (!isLeader(member.role)) return leadersOnly();
      toli.inviteToken = newToken();
      return HttpResponse.json({ inviteUrl: inviteUrl(toli.inviteToken) });
    }),
  ),

  http.get(apiUrl('/toli-invites/:token'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const toli = db.tolis.find((t) => t.inviteToken === params.token);
    if (!toli || blockedWith(toli, user.id)) return notMember();
    const sutradhar = toli.members.find((m) => m.role === 'sutradhar');
    return HttpResponse.json({
      invite: { toliId: toli.id, name: toli.name, type: toli.type, memberCount: toli.members.length, ...(sutradhar ? { sutradhar: personOf(sutradhar.userId) } : {}), alreadyMember: toli.members.some((m) => m.userId === user.id) },
    });
  }),

  http.post(apiUrl('/toli-invites/:token/join'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return needLogin();
    const toli = db.tolis.find((t) => t.inviteToken === params.token);
    if (!toli || blockedWith(toli, user.id)) return notMember();
    if (!toli.members.some((m) => m.userId === user.id)) {
      if (toli.members.length >= MAX_MEMBERS) return clash(`This Toli is full (${MAX_MEMBERS} Sahyatris).`);
      toli.members.push({ userId: user.id, role: 'sahyatri', joinedAt: nowIso() });
      logEvent(toli.id, user.id, 'joined', { via: 'link' });
    }
    return HttpResponse.json({ toli: toliView(toli, toli.members.find((m) => m.userId === user.id)!) });
  }),

  http.post(apiUrl('/tolis/:id/members'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      if (!isLeader(member.role)) return leadersOnly();
      const { username = '' } = (await request.json()) as { username?: string };
      const other = db.users.find((u) => u.username === username.trim().replace(/^@/, '').toLowerCase());
      if (!other || blockedWith(toli, other.id)) return errorResponse(404, 'NOT_FOUND', 'No traveller with that username');
      const friends = db.friendships.some((f) => f.status === 'accepted' && ((f.requester === user.id && f.recipient === other.id) || (f.recipient === user.id && f.requester === other.id)));
      if (!friends) return leadersOnly('You can add friends only — share the invite link with anyone else.');
      if (!toli.members.some((m) => m.userId === other.id)) {
        if (toli.members.length >= MAX_MEMBERS) return clash(`This Toli is full (${MAX_MEMBERS} Sahyatris).`);
        toli.members.push({ userId: other.id, role: 'sahyatri', joinedAt: nowIso() });
        logEvent(toli.id, other.id, 'joined', { via: 'username', addedBy: user.id });
      }
      return HttpResponse.json({ toli: toliView(toli, member) });
    }),
  ),

  http.patch(apiUrl('/tolis/:id/members/:userId'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const { role, requestsOff } = (await request.json()) as { role?: ToliRole; requestsOff?: boolean };
      const target = toli.members.find((m) => m.userId === params.userId);
      if (role !== undefined && member.role !== 'sutradhar') return leadersOnly('Only the Sutradhar can change roles.');
      if (requestsOff !== undefined && !isLeader(member.role)) return leadersOnly();
      if (!target) return errorResponse(404, 'NOT_FOUND', 'That person isn’t in this Toli.');
      if (requestsOff !== undefined) target.requestsOff = requestsOff;
      if (role !== undefined) {
        if (target === member) return clash('Pass the Sutradhar role to someone else instead.');
        if (role === 'sutradhar') member.role = 'sah';
        target.role = role;
        logEvent(toli.id, user.id, 'role', { userId: target.userId, role });
      }
      return HttpResponse.json({ toli: toliView(toli, member) });
    }),
  ),

  http.delete(apiUrl('/tolis/:id/members/:userId'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const target = toli.members.find((m) => m.userId === params.userId);
      if (!target) return errorResponse(404, 'NOT_FOUND', 'That person isn’t in this Toli.');
      if (target.userId === user.id) {
        if (member.role === 'sutradhar') return clash('Pass the Sutradhar role to someone first.');
      } else {
        if (!isLeader(member.role)) return leadersOnly();
        if (target.role === 'sutradhar' || (target.role === 'sah' && member.role !== 'sutradhar')) return leadersOnly('You can’t remove that person.');
      }
      // Nobody leaves owing money, or being owed it — the Lekha must still add up.
      if ((toliNet(toli.id)[target.userId] ?? 0) !== 0) return clash('Settle up first — this Sahyatri still owes or is owed money in the Lekha.');
      toli.members = toli.members.filter((m) => m !== target);
      delete db.toliBudgets[`${toli.id}|${target.userId}`];
      logEvent(toli.id, user.id, target.userId === user.id ? 'left' : 'removed', target.userId === user.id ? {} : { userId: target.userId });
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.patch(apiUrl('/tolis/:id/me'), ({ request, params }) =>
    asMember(request, params.id, async (_user, toli, member) => {
      const { phone, upi } = (await request.json()) as { phone?: string | null; upi?: string | null };
      if (phone === undefined && upi === undefined) return invalid('Nothing to change.');
      if (phone === null) delete member.phone;
      else if (phone !== undefined) {
        const digits = phone.replace(/[\s()-]/g, '');
        if (!/^(\+?91)?[6-9]\d{9}$/.test(digits)) return invalid('Enter a 10-digit Indian mobile number.');
        member.phone = `+91${digits.slice(-10)}`;
      }
      if (upi === null) delete member.upi;
      else if (upi !== undefined) {
        if (!isUpiId(upi.trim())) return invalid('That doesn’t look like a UPI ID (like name@bank).');
        member.upi = upi.trim();
      }
      return HttpResponse.json({ toli: toliView(toli, member) });
    }),
  ),

  // ── Budget comfort ──
  http.get(apiUrl('/tolis/:id/budget'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => HttpResponse.json({ budget: { mine: db.toliBudgets[`${toli.id}|${user.id}`] ?? null, group: groupBudget(toli) } })),
  ),
  http.put(apiUrl('/tolis/:id/budget'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      const { low, high } = (await request.json()) as { low: number; high: number };
      if (!Number.isInteger(low) || !Number.isInteger(high) || low < 100 || high > 100_000 || low > high) return invalid('The lower number should come first (₹100 – ₹1,00,000 a day).');
      db.toliBudgets[`${toli.id}|${user.id}`] = [low, high];
      return HttpResponse.json({ budget: { mine: [low, high], group: groupBudget(toli) } });
    }),
  ),
  http.delete(apiUrl('/tolis/:id/budget'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      delete db.toliBudgets[`${toli.id}|${user.id}`];
      return HttpResponse.json({ budget: { mine: null, group: groupBudget(toli) } });
    }),
  ),

  // ── Activity ──
  http.get(apiUrl('/tolis/:id/activity'), ({ request, params }) =>
    asMember(request, params.id, (_user, toli) => {
      const before = new URL(request.url).searchParams.get('before');
      const events = db.toliEvents.filter((e) => e.toliId === toli.id && (!before || e.at < before)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
      return HttpResponse.json({ activity: events.map((e) => ({ id: e.id, actor: personOf(e.actorId), type: e.type, data: e.data, at: e.at })) });
    }),
  ),

  // ── Sujhav (suggestions) ──
  http.post(apiUrl('/tolis/:id/sujhavs'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      if (!toli.tripId) return clash('Plan the Sahyatra first — then everyone can suggest changes.');
      const { change, note } = (await request.json()) as { change: SujhavChange; note?: string };
      if (!change || !KIND_WORDS[change.kind]) return invalid('That suggestion isn’t one TripWise understands.');
      if (note && note.length > 280) return invalid('Keep the note under 280 characters.');
      if ('stop' in change && change.stop && !change.stop.description) change.stop.description = 'Suggested by the Toli.';
      const sujhav: MockSujhav = { id: newId('sj'), toliId: toli.id, authorId: user.id, change, ...(note ? { note } : {}), votes: {}, status: 'open', createdAt: nowIso() };
      db.sujhavs.push(sujhav);
      logEvent(toli.id, user.id, 'suggested', { sujhavId: sujhav.id, kind: change.kind });
      postCard(toli.id, user.id, { type: 'sujhav', id: sujhav.id });
      return HttpResponse.json({ sujhav: sujhavView(sujhav, user.id) }, { status: 201 });
    }),
  ),
  http.get(apiUrl('/tolis/:id/sujhavs'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      const status = new URL(request.url).searchParams.get('status');
      const list = db.sujhavs.filter((s) => s.toliId === toli.id && (!status || s.status === status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json({ sujhavs: list.map((s) => sujhavView(s, user.id)) });
    }),
  ),
  http.put(apiUrl('/tolis/:id/sujhavs/:sid/vote'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      const sujhav = db.sujhavs.find((s) => s.id === params.sid && s.toliId === toli.id);
      if (!sujhav) return errorResponse(404, 'NOT_FOUND', 'We couldn’t find that suggestion.');
      if (sujhav.status !== 'open') return clash('This suggestion has already been decided.');
      const { vote } = (await request.json()) as { vote: 1 | -1 | 0 };
      if (vote === 0) delete sujhav.votes[user.id];
      else sujhav.votes[user.id] = vote;
      return HttpResponse.json({ sujhav: sujhavView(sujhav, user.id) });
    }),
  ),
  http.post(apiUrl('/tolis/:id/sujhavs/:sid/approve'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      if (!isLeader(member.role)) return leadersOnly();
      const sujhav = db.sujhavs.find((s) => s.id === params.sid && s.toliId === toli.id);
      if (!sujhav) return errorResponse(404, 'NOT_FOUND', 'We couldn’t find that suggestion.');
      if (sujhav.status !== 'open') return clash('This suggestion has already been decided.');
      const trip = db.itineraries.find((t) => t.id === toli.tripId);
      if (!trip) return clash('This Toli has no Sahyatra to change.');
      const result = applySujhav(trip.days as unknown as DayLike[], sujhav.change, MAX_DAYS);
      if (!result.ok) return clash(result.reason === 'too-long' ? `Trips can be up to ${MAX_DAYS} days.` : 'The plan has changed since this was suggested — ask for a fresh suggestion.');
      trip.days = result.days as unknown as typeof trip.days;
      if (sujhav.change.kind === 'add-day') trip.request.endDate = result.days[result.days.length - 1].date;
      saveTrips();
      Object.assign(sujhav, { status: 'approved', decidedBy: user.id, decidedAt: nowIso() });
      logEvent(toli.id, user.id, 'approved', { sujhavId: sujhav.id, authorId: sujhav.authorId });
      return HttpResponse.json({ sujhav: sujhavView(sujhav, user.id) });
    }),
  ),
  http.post(apiUrl('/tolis/:id/sujhavs/:sid/decline'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      if (!isLeader(member.role)) return leadersOnly();
      const sujhav = db.sujhavs.find((s) => s.id === params.sid && s.toliId === toli.id);
      if (!sujhav) return errorResponse(404, 'NOT_FOUND', 'We couldn’t find that suggestion.');
      if (sujhav.status !== 'open') return clash('This suggestion has already been decided.');
      const { reason } = ((await request.json().catch(() => ({}))) ?? {}) as { reason?: string };
      Object.assign(sujhav, { status: 'declined', decidedBy: user.id, decidedAt: nowIso(), ...(reason ? { reason } : {}) });
      logEvent(toli.id, user.id, 'declined', { sujhavId: sujhav.id, authorId: sujhav.authorId });
      return HttpResponse.json({ sujhav: sujhavView(sujhav, user.id) });
    }),
  ),

  // ── Polls ──
  http.post(apiUrl('/tolis/:id/polls'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      const input = (await request.json()) as NewPoll;
      if (!input.options || input.options.length < 2 || input.options.length > 10) return invalid('A poll needs 2–10 options.');
      let options: MockPoll['options'];
      if (input.kind === 'destination') {
        options = input.options.map((o, i) => {
          const known = db.destinations.find((d) => plain(d.name) === plain(o.label) || plain(d.slug.replace(/-/g, ' ')) === plain(o.label.split(',')[0]));
          return { id: `o${i + 1}`, label: o.label.trim(), ...(known ? { destination: known.slug } : {}) };
        });
      } else if (input.kind === 'tithi') {
        for (const o of input.options) {
          if (o.start < today()) return invalid("Dates can't be in the past.");
          const days = daysBetween(o.start, o.end);
          if (days < 1 || days > 14) return invalid('Each date option should be 1–14 days.');
        }
        options = input.options.map((o, i) => ({ id: `o${i + 1}`, label: rangeLabel(o.start, o.end), start: o.start, end: o.end }));
      } else if (input.kind === 'transport') {
        options = input.options.map((o, i) => ({ id: `o${i + 1}`, label: TRANSPORT[o.mode], mode: o.mode }));
      } else if (input.kind === 'free') {
        if (!input.question?.trim()) return invalid('What are you asking?');
        options = input.options.map((o, i) => ({ id: `o${i + 1}`, label: o.label.trim() }));
      } else return invalid('Pick a kind of poll: destination, tithi, transport or free.');
      const poll: MockPoll = {
        id: newId('pl'),
        toliId: toli.id,
        authorId: user.id,
        kind: input.kind,
        question: input.question?.trim() || QUESTION[input.kind as keyof typeof QUESTION],
        options,
        multi: input.kind === 'tithi',
        ...(input.closesAt ? { closesAt: new Date(input.closesAt).toISOString() } : {}),
        status: 'open',
        votes: {},
        createdAt: nowIso(),
      };
      db.polls.push(poll);
      logEvent(toli.id, user.id, 'poll-created', { pollId: poll.id, question: poll.question });
      postCard(toli.id, user.id, { type: 'poll', id: poll.id });
      return HttpResponse.json({ poll: pollView(poll, user.id, toli) }, { status: 201 });
    }),
  ),
  http.get(apiUrl('/tolis/:id/polls'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      const list = db.polls.filter((p) => p.toliId === toli.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json({ polls: list.map((p) => pollView(p, user.id, toli)) });
    }),
  ),
  http.put(apiUrl('/tolis/:id/polls/:pid/vote'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      const poll = db.polls.find((p) => p.id === params.pid && p.toliId === toli.id);
      if (!poll) return errorResponse(404, 'NOT_FOUND', 'We couldn’t find that poll.');
      if (!pollOpen(poll)) return clash('This poll has closed.');
      const { optionIds } = (await request.json()) as { optionIds: string[] };
      const unique = [...new Set(optionIds)];
      if (unique.some((id) => !poll.options.some((o) => o.id === id))) return invalid('Pick from the poll’s options.');
      if (!poll.multi && unique.length > 1) return invalid('Pick one option.');
      if (unique.length) poll.votes[user.id] = unique;
      else delete poll.votes[user.id];
      return HttpResponse.json({ poll: pollView(poll, user.id, toli) });
    }),
  ),
  http.post(apiUrl('/tolis/:id/polls/:pid/close'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      if (!isLeader(member.role)) return leadersOnly();
      const poll = db.polls.find((p) => p.id === params.pid && p.toliId === toli.id);
      if (!poll) return errorResponse(404, 'NOT_FOUND', 'We couldn’t find that poll.');
      if (poll.status === 'closed') return clash('This poll is already closed.');
      const { winner } = ((await request.json().catch(() => ({}))) ?? {}) as { winner?: string };
      const leading = tallyPoll(poll.options, poll.votes, toli.members.map((m) => m.userId)).leading;
      const chosen = winner ?? (leading.length === 1 ? leading[0] : undefined);
      if (!chosen) return invalid(leading.length ? "It's a tie — pick the winner." : 'Nobody has voted yet — pick the winner.');
      const option = poll.options.find((o) => o.id === chosen);
      if (!option) return invalid('Pick the winner from the poll’s options.');
      Object.assign(poll, { status: 'closed', winner: chosen });
      if (poll.kind === 'destination') toli.choices.destination = option.label;
      if (poll.kind === 'tithi') Object.assign(toli.choices, { startDate: option.start, endDate: option.end });
      if (poll.kind === 'transport') toli.choices.transport = option.mode;
      logEvent(toli.id, user.id, 'poll-closed', { pollId: poll.id, question: poll.question, winner: option.label });
      return HttpResponse.json({ poll: pollView(poll, user.id, toli) });
    }),
  ),

  // ── Chaupal (chat) ──
  http.get(apiUrl('/tolis/:id/messages'), ({ request, params }) =>
    asMember(request, params.id, (user, toli) => {
      const after = new URL(request.url).searchParams.get('after');
      const all = db.messages.filter((m) => m.toliId === toli.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const list = after ? all.filter((m) => m.createdAt > new Date(after).toISOString()).slice(0, 50) : all.slice(-50);
      return HttpResponse.json({ messages: list.map((m) => messageView(m, user.id)) });
    }),
  ),
  http.post(apiUrl('/tolis/:id/messages'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const input = (await request.json()) as NewMessage;
      const earlier = db.messages.find((m) => m.toliId === toli.id && m.authorId === user.id && m.clientId === input.clientId);
      if (earlier) return HttpResponse.json({ message: messageView(earlier, user.id) });
      const text = (input.text ?? '').trim();
      if (!text && !input.photoIds?.length && !input.card) return invalid('Write something first.');
      if (text.length > 2000) return invalid('Keep messages under 2,000 characters.');
      if (!mayPost(toli, member)) return errorResponse(403, 'FORBIDDEN', 'Announcement mode — raise your hand to ask.');
      if ((input.photoIds ?? []).some((id) => db.photos[id]?.ownerId !== user.id)) return invalid('Add your own photos only.');
      const names = [...text.matchAll(/@([a-z0-9_]{3,20})/gi)].map((m) => m[1].toLowerCase());
      const mentions = db.users.filter((u) => names.includes(u.username) && toli.members.some((m) => m.userId === u.id)).map((u) => u.id);
      const message: MockMessage = {
        id: newId('ms'),
        toliId: toli.id,
        authorId: user.id,
        text,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
        mentions,
        photoIds: input.photoIds ?? [],
        ...(input.card ? { card: input.card } : {}),
        clientId: input.clientId,
        createdAt: nowIso(),
      };
      db.messages.push(message);
      if (member.oneMessage) member.oneMessage = false;
      return HttpResponse.json({ message: messageView(message, user.id) }, { status: 201 });
    }),
  ),
  http.post(apiUrl('/tolis/:id/messages/photos'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli) => {
      const blob = await request.blob();
      if (!/^image\/(jpeg|png|webp)$/.test(blob.type) || blob.size > 1.5 * 1024 * 1024) return invalid('Please choose a JPG, PNG or WebP image under 1.5 MB');
      const id = newId('ph');
      db.photos[id] = { ownerId: user.id, itineraryId: toli.id, blob };
      return HttpResponse.json({ photo: { id, url: `/api/photos/${id}?v=${user.id}` } }, { status: 201 });
    }),
  ),
  http.post(apiUrl('/tolis/:id/read'), ({ request, params }) =>
    asMember(request, params.id, (_user, _toli, member) => {
      member.lastReadAt = nowIso();
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // ── Anurodh (raise your hand) ──
  http.post(apiUrl('/tolis/:id/anurodh'), ({ request, params }) =>
    asMember(request, params.id, async (user, toli, member) => {
      const { about = '' } = (await request.json()) as { about?: string };
      if (!about.trim() || about.length > 200) return invalid('Say what it’s about (under 200 characters).');
      if (mayPost(toli, member)) return clash('You can already write in Chaupal.');
      if (member.requestsOff) return leadersOnly('Your leaders have turned off requests for you.');
      if (db.anurodhs.some((a) => a.toliId === toli.id && a.userId === user.id && a.status === 'open')) return clash('Your hand is already raised.');
      const declined = db.anurodhs.filter((a) => a.toliId === toli.id && a.userId === user.id && a.status === 'declined' && a.decidedAt).sort((a, b) => b.decidedAt!.localeCompare(a.decidedAt!))[0];
      const waitMs = declined ? Date.parse(declined.decidedAt!) + 10 * 60_000 - Date.now() : 0;
      if (waitMs > 0) return errorResponse(429, 'QUOTA_EXCEEDED', `Try again in ${Math.ceil(waitMs / 60_000)} minutes.`);
      const anurodh = { id: newId('an'), toliId: toli.id, userId: user.id, about: about.trim(), status: 'open' as const, createdAt: nowIso() };
      db.anurodhs.push(anurodh);
      return HttpResponse.json({ anurodh: anurodhView(anurodh, true) }, { status: 201 });
    }),
  ),
  http.get(apiUrl('/tolis/:id/anurodh'), ({ request, params }) =>
    asMember(request, params.id, (user, toli, member) => {
      const open = isLeader(member.role) ? db.anurodhs.filter((a) => a.toliId === toli.id && a.status === 'open') : [];
      const mine = db.anurodhs.filter((a) => a.toliId === toli.id && a.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return HttpResponse.json({ requests: open.map((a) => anurodhView(a, false)), mine: mine ? anurodhView(mine, true) : null });
    }),
  ),
  http.post(apiUrl('/tolis/:id/anurodh/:rid/decide'), ({ request, params }) =>
    asMember(request, params.id, async (_user, toli, member) => {
      if (!isLeader(member.role)) return leadersOnly();
      const anurodh = db.anurodhs.find((a) => a.id === params.rid && a.toliId === toli.id);
      if (!anurodh) return errorResponse(404, 'NOT_FOUND', 'We couldn’t find that request.');
      if (anurodh.status !== 'open') return clash('This request has already been answered.');
      const { action, reply } = (await request.json()) as { action: AnurodhAction; reply?: string };
      if (action === 'reply' && !reply?.trim()) return invalid('Write the reply.');
      const asker = toli.members.find((m) => m.userId === anurodh.userId);
      if (action === 'decline') anurodh.status = 'declined';
      else if (action === 'reply') Object.assign(anurodh, { status: 'answered', reply: reply!.trim() });
      else {
        Object.assign(anurodh, { status: 'granted', grant: action });
        if (asker) {
          if (action === 'one') asker.oneMessage = true;
          else if (action === 'trip') {
            const trip = db.itineraries.find((t) => t.id === toli.tripId);
            asker.postUntil = trip ? new Date(`${trip.request.endDate}T23:59:59+05:30`).toISOString() : new Date(Date.now() + 30 * 86_400_000).toISOString();
          } else asker.postUntil = new Date(Date.now() + (action === '30m' ? 30 : 60) * 60_000).toISOString();
        }
      }
      anurodh.decidedAt = nowIso();
      return HttpResponse.json({ anurodh: anurodhView(anurodh, false) });
    }),
  ),
];

/** May this person see a photo shared in a Toli chat? (Members of that Toli.) */
export function canSeeChatPhoto(viewerId: string | null, photoId: string): boolean {
  if (!viewerId) return false;
  return db.messages.some((m) => m.photoIds.includes(photoId) && !!membership(m.toliId, viewerId));
}

/** The Toli a trip belongs to, and whether this user may read / change it (mock itineraries use this). */
export function toliAccess(trip: { toliId?: string | null; ownerId: string }, userId: string): { read: boolean; change: boolean } {
  const found = trip.toliId ? membership(trip.toliId, userId) : null;
  if (found) return { read: true, change: isLeader(found.member.role) };
  return trip.ownerId === userId ? { read: true, change: true } : { read: false, change: false };
}

/** Planning for a Toli (`toliId` in the body): null when it's fine, else the error response. */
export function checkToliPlanner(toliId: string | undefined, userId: string): Response | null {
  if (!toliId) return null;
  const found = membership(toliId, userId);
  if (!found) return notMember();
  return isLeader(found.member.role) ? null : leadersOnly('Only the Sutradhar and Sah-Sutradhars can plan the Sahyatra.');
}

/** Make a newly planned trip its Toli's Sahyatra. */
export function linkSahyatra(toliId: string | undefined, trip: { id: string; title: string; toliId?: string | null }, userId: string) {
  if (!toliId) return;
  const toli = db.tolis.find((t) => t.id === toliId);
  if (!toli) return;
  trip.toliId = toli.id;
  toli.tripId = trip.id;
  saveTrips();
  logEvent(toli.id, userId, 'planned', { tripId: trip.id, title: trip.title });
}
