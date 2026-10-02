/**
 * destinations.ts (mock) — fake GET /destinations (with filters) and GET /destinations/:slug.
 */
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import { db } from '../db';
import { errorResponse, latency } from './shared';

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

  // GET /destinations/:slug — one destination or NOT_FOUND.
  http.get(apiUrl('/destinations/:slug'), async ({ params }) => {
    await latency();
    const destination = db.destinations.find((d) => d.slug === params.slug);
    if (!destination) return errorResponse(404, 'NOT_FOUND', "We couldn't find that destination.");
    return HttpResponse.json({ destination });
  }),
];
