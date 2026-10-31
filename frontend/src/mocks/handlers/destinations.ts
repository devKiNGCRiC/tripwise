/**
 * destinations.ts (mock) — fake GET /destinations (with filters), GET /destinations/:slug and
 * GET /destinations/:slug/places (most famous first, optional interest filter) — same rules
 * and errors as the real API.
 */
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import type { Interest } from '@/lib/api/types';
import { seedPlaces } from '../data/destinations';
import { db } from '../db';
import { errorResponse, latency } from './shared';

/** Interests a place can be filtered by (same list as the real API). */
const INTERESTS: Interest[] = ['food', 'culture', 'adventure', 'nightlife', 'nature', 'shopping', 'history', 'relaxation', 'photography', 'spiritual'];

export const destinationHandlers = [
  // GET /destinations?vibe=&budget=&month=&q= — every filter is optional and they combine (AND).
  http.get(apiUrl('/destinations'), async ({ request }) => {
    await latency();
    const params = new URL(request.url).searchParams;
    const vibe = params.get('vibe');
    const budget = params.get('budget');
    const month = Number(params.get('month')) || null;
    const q = params.get('q')?.trim().toLowerCase();

    const destinations = db.destinations.filter(
      (d) =>
        (!vibe || d.vibes.includes(vibe as (typeof d.vibes)[number])) &&
        (!budget || d.budgetTier === budget) &&
        (!month || d.bestMonths.includes(month)) &&
        (!q || d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)),
    );
    return HttpResponse.json({ destinations });
  }),

  // GET /destinations/:slug/places?interest= — the destination's places (none abroad yet).
  http.get(apiUrl('/destinations/:slug/places'), async ({ request, params }) => {
    await latency();
    const interest = new URL(request.url).searchParams.get('interest');
    if (interest && !INTERESTS.includes(interest as Interest)) return errorResponse(400, 'VALIDATION', 'Pick a known interest.');
    if (!db.destinations.some((d) => d.slug === params.slug)) return errorResponse(404, 'NOT_FOUND', "We couldn't find that destination.");
    const places = seedPlaces
      .filter((p) => p.destination === params.slug && (!interest || p.interests.includes(interest as Interest)))
      .sort((a, b) => b.fame - a.fame || a.name.localeCompare(b.name));
    return HttpResponse.json({ places });
  }),

  // GET /destinations/:slug — one destination or NOT_FOUND.
  http.get(apiUrl('/destinations/:slug'), async ({ params }) => {
    await latency();
    const destination = db.destinations.find((d) => d.slug === params.slug);
    if (!destination) return errorResponse(404, 'NOT_FOUND', "We couldn't find that destination.");
    return HttpResponse.json({ destination });
  }),
];
