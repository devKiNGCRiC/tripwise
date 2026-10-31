/**
 * destinations.ts (routes) — the public Explore catalogue:
 *
 *   GET /api/destinations?vibe=&budget=&month=&q=   → { destinations }  (filters combine)
 *   GET /api/destinations/:slug                     → { destination }   or 404
 *   GET /api/destinations/:slug/places?interest=    → { places }        most famous first, or 404
 *
 * Search text is matched literally (regex characters escaped) against the name, the
 * country and the Hindi name.
 */
import { Router } from 'express';
import { z } from 'zod';
import { Destination, Place } from '../db/models/index.js';
import { INTERESTS } from '../lib/enums.js';
import { notFound } from '../lib/errors.js';

/** Allowed filters; anything else in the query string is ignored. */
const filtersSchema = z.object({
  vibe: z.string().trim().max(30).optional(),
  budget: z.enum(['budget', 'mid', 'luxury'], { error: 'Budget must be budget, mid or luxury.' }).optional(),
  month: z.coerce.number({ error: 'Month must be 1–12.' }).int().min(1, 'Month must be 1–12.').max(12, 'Month must be 1–12.').optional(),
  q: z.string().trim().max(80).optional(),
});

/** Allowed filter for a destination's places. */
const placesSchema = z.object({ interest: z.enum(INTERESTS, { error: 'Pick a known interest.' }).optional() });

/** Fields never sent to the website. */
const HIDDEN = { _id: 0, order: 0 } as const;

/** "a.b(" → "a\.b\(" so user text is matched literally. */
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The destination routes. */
export function destinationRoutes(): Router {
  const router = Router();

  // GET /destinations — the filtered catalogue, in catalogue order.
  router.get('/destinations', async (req, res) => {
    const { vibe, budget, month, q } = filtersSchema.parse(req.query);
    const query: Record<string, unknown> = {};
    if (vibe) query.vibes = vibe;
    if (budget) query.budgetTier = budget;
    if (month) query.bestMonths = month;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i');
      query.$or = [{ name: pattern }, { country: pattern }, { localName: pattern }];
    }
    const destinations = await Destination.find(query, HIDDEN).sort({ order: 1 }).lean();
    res.json({ destinations });
  });

  // GET /destinations/:slug — one place.
  router.get('/destinations/:slug', async (req, res) => {
    const destination = await Destination.findOne({ slug: String(req.params.slug).toLowerCase() }, HIDDEN).lean();
    if (!destination) throw notFound("We couldn't find that destination.");
    res.json({ destination });
  });

  // GET /destinations/:slug/places — the destination's places (none yet for places abroad).
  router.get('/destinations/:slug/places', async (req, res) => {
    const { interest } = placesSchema.parse(req.query);
    const slug = String(req.params.slug).toLowerCase();
    if (!(await Destination.exists({ slug }))) throw notFound("We couldn't find that destination.");
    const places = await Place.find({ destination: slug, ...(interest ? { interests: interest } : {}) }, { _id: 0 })
      .sort({ fame: -1, name: 1 })
      .lean();
    res.json({ places });
  });

  return router;
}
