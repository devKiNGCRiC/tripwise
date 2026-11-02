/**
 * ask.ts (mock) — Ask TripWise for demo mode. The real API asks TripWise's AI with a brief about
 * the trip; the demo answers from the same facts without any AI: the destination's best-known
 * catalogue places (as chips), its best months and typical cost. Same routes, shapes, codes,
 * access rules (owner or Toli member; others NOT_FOUND) and daily allowance (20) as the API.
 */
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import type { AskMessage, Quota } from '@/lib/api/types';
import { seedDestinations, seedPlaces } from '../data/destinations';
import { db, type MockAskMessage } from '../db';
import { currentUser, errorResponse, latency } from './shared';
import { toliAccess } from './tolis';

/** Questions per day (free plan). */
const ASKS_PER_DAY = 20;
/** Messages kept per conversation. */
const KEEP = 30;
/** Short month names. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A stored conversation message (place ids instead of chips). */
type Stored = MockAskMessage;

/** Today, local time ("YYYY-MM-DD"). */
const today = () => new Date().toLocaleDateString('en-CA');

/** The caller's question allowance right now. */
function quotaFor(userId: string): Quota {
  const record = db.asks[userId];
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return { used: record?.day === today() ? record.used : 0, limit: ASKS_PER_DAY, resetsAt: midnight.toISOString() };
}

/** Stored messages as the website shows them (ids become place chips). */
const view = (m: Stored): AskMessage => {
  const { placeIds, ...rest } = m;
  const places = (placeIds ?? []).flatMap((id) => {
    const p = seedPlaces.find((x) => x.id === id);
    return p ? [{ id: p.id, name: p.name, destination: p.destination }] : [];
  });
  return { ...rest, ...(places.length ? { places } : {}) };
};

/** The trip the caller may read, or null. */
function readable(tripId: unknown, userId: string) {
  const trip = db.itineraries.find((t) => t.id === tripId);
  return trip && toliAccess(trip, userId).read ? trip : null;
}

/** "a", "a and b", "a, b and c". */
const listOf = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

/** A demo answer from the trip and the catalogue. */
function demoAnswer(destinationText: string): Stored {
  const text = destinationText.toLowerCase();
  const destination = seedDestinations.find((d) => text.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(text.split(',')[0].trim()));
  const top = destination ? seedPlaces.filter((p) => p.destination === destination.slug).sort((a, b) => b.fame - a.fame).slice(0, 3) : [];
  const parts = [
    top.length ? `Near your plan in ${destination!.name}, ${listOf(top.map((p) => p.name))} ${top.length > 1 ? 'are' : 'is'} well worth a stop.` : `For ${destinationText}, start early and keep the afternoons light.`,
    destination?.bestMonths.length ? `The best months here are ${destination.bestMonths.map((m) => MONTHS[m - 1]).join(', ')}.` : '',
    destination ? `Plan on about ₹${destination.avgDailyCost.amount.toLocaleString('en-IN')} a day per person.` : '',
    '(This is the demo — the real app asks TripWise’s AI with your whole trip and the forecast.)',
  ];
  return {
    role: 'assistant',
    text: parts.filter(Boolean).join(' '),
    placeIds: top.map((p) => p.id),
    followUps: ['What should I pack?', 'Where can we eat nearby?', 'Is it too hot at midday?'],
    at: new Date(Date.now() + 1).toISOString(),
  };
}

export const askHandlers = [
  http.get(apiUrl('/itineraries/:id/ask'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const trip = readable(params.id, user.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    return HttpResponse.json({ messages: (db.tripChats[`${trip.id}|${user.id}`] ?? []).map(view), quota: quotaFor(user.id) });
  }),

  http.post(apiUrl('/itineraries/:id/ask'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const trip = readable(params.id, user.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    const question = (((await request.json()) as { question?: string }).question ?? '').trim();
    if (!question || question.length > 300) return errorResponse(400, 'VALIDATION', 'Ask a question (under 300 characters).');
    const quota = quotaFor(user.id);
    if (quota.used >= quota.limit) return errorResponse(429, 'QUOTA_EXCEEDED', `You've asked today's ${ASKS_PER_DAY} questions — more tomorrow.`);
    db.asks[user.id] = { day: today(), used: quota.used + 1 };
    const reply = demoAnswer(trip.request.destination);
    const key = `${trip.id}|${user.id}`;
    db.tripChats[key] = [...(db.tripChats[key] ?? []), { role: 'user' as const, text: question, at: new Date().toISOString() }, reply].slice(-KEEP);
    return HttpResponse.json({ reply: view(reply), quota: quotaFor(user.id) });
  }),

  http.delete(apiUrl('/itineraries/:id/ask'), async ({ request, params }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const trip = readable(params.id, user.id);
    if (!trip) return errorResponse(404, 'NOT_FOUND', "We couldn't find that trip.");
    delete db.tripChats[`${trip.id}|${user.id}`];
    return new HttpResponse(null, { status: 204 });
  }),
];
