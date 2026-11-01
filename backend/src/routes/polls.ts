/**
 * polls.ts (routes) — a Toli's polls (login required):
 *
 *   POST /api/tolis/:id/polls                 { kind, question?, options, closesAt? } → 201 { poll }  any Sahyatri
 *   GET  /api/tolis/:id/polls                                                         → { polls }      newest first
 *   PUT  /api/tolis/:id/polls/:pid/vote       { optionIds }  → { poll }   [] clears; one only unless it's a Tithi poll
 *   POST /api/tolis/:id/polls/:pid/close      { winner? }    → { poll }   leaders; a tie needs `winner`
 *
 * Kinds: destination (options are places — each compared on TripWise's own facts when it's in
 * the catalogue), tithi (date ranges, ≤ 14 days, not in the past; several may be picked),
 * transport (train, bus, flight, car, bike) and free (any question). Polls past their closing
 * time take no votes. Closing writes the winner to the Toli's choices (destination, dates,
 * transport) so the planner can start from them. Every poll lists who hasn't voted yet —
 * current members only.
 */
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Destination, Place, Poll, User } from '../db/models/index.js';
import { badRequest, clash, notFound } from '../lib/errors.js';
import { daysBetweenInclusive } from '../lib/dates.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { postCard } from '../services/chaupal.js';
import { findDestination } from '../services/places.js';
import { istDay } from '../services/quota.js';
import { loadMember, logActivity, requireLeader } from '../services/tolis.js';
import { tallyPoll } from '../services/toliRules.js';

/** The default question for each kind of poll. */
const QUESTION = { destination: 'Where shall we go?', tithi: 'When can you go?', transport: 'How shall we travel?' } as const;
/** How each way of travelling reads. */
const TRANSPORT = { train: 'Train', bus: 'Bus', flight: 'Flight', car: 'Road trip by car', bike: 'Bike ride' } as const;
/** Short month names. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Places shown per destination option. */
const TOP_PLACES = 3;

/** A date range in words: "1–4 Dec", "28 Dec – 2 Jan". */
function rangeLabel(start: string, end: string): string {
  const [sd, sm] = [Number(start.slice(8, 10)), MONTHS[Number(start.slice(5, 7)) - 1]];
  const [ed, em] = [Number(end.slice(8, 10)), MONTHS[Number(end.slice(5, 7)) - 1]];
  if (start === end) return `${sd} ${sm}`;
  return sm === em ? `${sd}–${ed} ${sm}` : `${sd} ${sm} – ${ed} ${em}`;
}

/** A "YYYY-MM-DD" date. */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates look like 2026-12-01.');
/** A new poll. */
const createSchema = z.discriminatedUnion(
  'kind',
  [
    z.object({ kind: z.literal('destination'), question: z.string().trim().max(140).optional(), options: z.array(z.object({ label: z.string().trim().min(1).max(80) })).min(2).max(10), closesAt: z.coerce.date().optional() }),
    z.object({ kind: z.literal('tithi'), question: z.string().trim().max(140).optional(), options: z.array(z.object({ start: day, end: day })).min(2).max(10), closesAt: z.coerce.date().optional() }),
    z.object({ kind: z.literal('transport'), question: z.string().trim().max(140).optional(), options: z.array(z.object({ mode: z.enum(['train', 'bus', 'flight', 'car', 'bike']) })).min(2).max(5), closesAt: z.coerce.date().optional() }),
    z.object({ kind: z.literal('free'), question: z.string().trim().min(1, 'What are you asking?').max(140), options: z.array(z.object({ label: z.string().trim().min(1).max(80) })).min(2).max(10), closesAt: z.coerce.date().optional() }),
  ],
  { error: 'Pick a kind of poll: destination, tithi, transport or free.' },
);

/** The poll routes. */
export function pollRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  /** Is the poll still taking votes? */
  const isOpen = (poll: InstanceType<typeof Poll>) => poll.status === 'open' && (!poll.closesAt || poll.closesAt > now());

  /** A poll as a member sees it. */
  async function viewOf(poll: InstanceType<typeof Poll>, viewerId: string, memberIds: string[]) {
    const votes = Object.fromEntries(poll.votes.entries()) as Record<string, string[]>;
    const tally = tallyPoll(poll.options, votes, memberIds);
    const notVoted = await User.find({ _id: { $in: tally.notVoted } }, { name: 1, username: 1 }).lean();
    // Destination options: TripWise's own facts for places in the catalogue.
    const facts = await Promise.all(
      poll.options.map(async (o) => {
        if (!o.destination) return null;
        const d = await Destination.findOne({ slug: o.destination }, { slug: 1, bestMonths: 1, avgDailyCost: 1 }).lean();
        if (!d) return null;
        const places = await Place.find({ destination: o.destination }, { name: 1 }).sort({ fame: -1 }).limit(TOP_PLACES).lean();
        return { slug: d.slug, bestMonths: d.bestMonths, avgDailyCost: d.avgDailyCost?.amount ?? null, topPlaces: places.map((p) => p.name) };
      }),
    );
    return {
      id: poll._id.toString(),
      kind: poll.kind,
      question: poll.question,
      options: poll.options.map((o, i) => ({
        id: o.id,
        label: o.label,
        ...(o.start ? { start: o.start, end: o.end } : {}),
        ...(o.mode ? { mode: o.mode } : {}),
        ...(poll.kind === 'destination' ? { facts: facts[i] } : {}),
      })),
      multi: poll.multi,
      ...(poll.closesAt ? { closesAt: poll.closesAt.toISOString() } : {}),
      status: isOpen(poll) ? 'open' : 'closed',
      ...(poll.winner ? { winner: poll.winner } : {}),
      counts: tally.counts,
      myVotes: votes[viewerId] ?? [],
      leading: tally.leading,
      notVoted: notVoted.map((u) => ({ id: u._id.toString(), name: u.name, username: u.username ?? '' })),
      authorId: poll.authorId,
      createdAt: (poll.get('createdAt') as Date).toISOString(),
    };
  }

  /** A poll of this Toli (404 otherwise). */
  async function findPoll(toliId: string, pid: string) {
    const poll = isValidObjectId(pid) ? await Poll.findOne({ _id: pid, toliId }) : null;
    if (!poll) throw notFound('We couldn’t find that poll.');
    return poll;
  }

  /** The Toli's current member ids. */
  const memberIdsOf = (toli: Awaited<ReturnType<typeof loadMember>>['toli']) => toli.members.map((m) => m.userId.toString());

  // POST /tolis/:id/polls — ask the Toli something.
  router.post('/tolis/:id/polls', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    const input = createSchema.parse(req.body);
    const at = now();
    if (input.closesAt && input.closesAt <= at) throw badRequest('Pick a closing time in the future.');

    // Each kind's options, labelled and checked.
    let options: { id: string; label: string; destination?: string; start?: string; end?: string; mode?: string }[];
    if (input.kind === 'destination') {
      options = await Promise.all(
        input.options.map(async (o, i) => {
          const known = await findDestination(o.label);
          return { id: `o${i + 1}`, label: o.label, ...(known ? { destination: known.slug } : {}) };
        }),
      );
    } else if (input.kind === 'tithi') {
      for (const o of input.options) {
        if (o.start < istDay(at)) throw badRequest("Dates can't be in the past.");
        const days = daysBetweenInclusive(o.start, o.end);
        if (days < 1 || days > 14) throw badRequest('Each date option should be 1–14 days.');
      }
      options = input.options.map((o, i) => ({ id: `o${i + 1}`, label: rangeLabel(o.start, o.end), start: o.start, end: o.end }));
    } else if (input.kind === 'transport') {
      options = input.options.map((o, i) => ({ id: `o${i + 1}`, label: TRANSPORT[o.mode], mode: o.mode }));
    } else {
      options = input.options.map((o, i) => ({ id: `o${i + 1}`, label: o.label }));
    }

    const poll = await Poll.create({
      toliId: toli._id.toString(),
      authorId: me,
      kind: input.kind,
      question: input.question || QUESTION[input.kind as keyof typeof QUESTION],
      options,
      multi: input.kind === 'tithi',
      ...(input.closesAt ? { closesAt: input.closesAt } : {}),
    });
    await logActivity(toli._id.toString(), me, 'poll-created', { pollId: poll._id.toString(), question: poll.question }, at);
    await postCard(toli._id.toString(), me, { type: 'poll', id: poll._id.toString() }, at);
    res.status(201).json({ poll: await viewOf(poll, me, memberIdsOf(toli)) });
  });

  // GET /tolis/:id/polls — the Toli's polls, newest first.
  router.get('/tolis/:id/polls', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    const polls = await Poll.find({ toliId: toli._id.toString() }).sort({ createdAt: -1, _id: -1 }).limit(50);
    res.json({ polls: await Promise.all(polls.map((p) => viewOf(p, me, memberIdsOf(toli)))) });
  });

  // PUT /tolis/:id/polls/:pid/vote — my choice(s); [] clears.
  router.put('/tolis/:id/polls/:pid/vote', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli } = await loadMember(String(req.params.id), me);
    const poll = await findPoll(toli._id.toString(), String(req.params.pid));
    if (!isOpen(poll)) throw clash('This poll has closed.');
    const { optionIds } = z.object({ optionIds: z.array(z.string()).max(10) }).parse(req.body);
    const unique = [...new Set(optionIds)];
    if (unique.some((id) => !poll.options.some((o) => o.id === id))) throw badRequest('Pick from the poll’s options.');
    if (!poll.multi && unique.length > 1) throw badRequest('Pick one option.');
    if (unique.length) poll.votes.set(me, unique);
    else poll.votes.delete(me);
    await poll.save();
    res.json({ poll: await viewOf(poll, me, memberIdsOf(toli)) });
  });

  // POST /tolis/:id/polls/:pid/close — decide (leaders); the winner becomes the Toli's choice.
  router.post('/tolis/:id/polls/:pid/close', auth, async (req, res) => {
    const me = currentUser(req).id;
    const { toli, member } = await loadMember(String(req.params.id), me);
    requireLeader(member);
    const poll = await findPoll(toli._id.toString(), String(req.params.pid));
    if (poll.status === 'closed') throw clash('This poll is already closed.');
    const { winner } = z.object({ winner: z.string().optional() }).parse(req.body ?? {});
    const leading = tallyPoll(poll.options, Object.fromEntries(poll.votes.entries()) as Record<string, string[]>, memberIdsOf(toli)).leading;
    const chosen = winner ?? (leading.length === 1 ? leading[0] : undefined);
    if (!chosen) throw badRequest(leading.length ? "It's a tie — pick the winner." : 'Nobody has voted yet — pick the winner.');
    const option = poll.options.find((o) => o.id === chosen);
    if (!option) throw badRequest('Pick the winner from the poll’s options.');

    poll.status = 'closed';
    poll.winner = chosen;
    await poll.save();
    // The decision, for the planner.
    toli.choices ??= {};
    if (poll.kind === 'destination') toli.choices.destination = option.label;
    if (poll.kind === 'tithi') Object.assign(toli.choices, { startDate: option.start, endDate: option.end });
    if (poll.kind === 'transport') toli.choices.transport = option.mode;
    await toli.save();
    await logActivity(toli._id.toString(), me, 'poll-closed', { pollId: poll._id.toString(), question: poll.question, winner: option.label }, now());
    res.json({ poll: await viewOf(poll, me, memberIdsOf(toli)) });
  });

  return router;
}
