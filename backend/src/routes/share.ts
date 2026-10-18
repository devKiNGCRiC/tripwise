/**
 * share.ts (routes) — public, read-only shared trips (no login needed):
 *
 *   GET /api/share/:shareId → { itinerary }   or 404 "This shared trip isn't available."
 */
import { Router } from 'express';
import { Itinerary } from '../db/models/index.js';
import { publicItinerary } from '../db/toPublic.js';
import { notFound } from '../lib/errors.js';

/** The share routes. */
export function shareRoutes(): Router {
  const router = Router();

  // GET /share/:shareId — anyone with the link can read the trip.
  router.get('/share/:shareId', async (req, res) => {
    const trip = await Itinerary.findOne({ shareId: String(req.params.shareId) });
    if (!trip) throw notFound("This shared trip isn't available.");
    res.json({ itinerary: publicItinerary(trip) });
  });

  return router;
}
