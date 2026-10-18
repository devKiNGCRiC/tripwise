/**
 * passport.ts (routes) — the signed-in traveller's own passport:
 *
 *   GET /api/me/passport → { passport }   cover, numbers, seven worlds, next world to
 *                                         unlock, Yatra marks and stamps (upcoming too)
 */
import { Router } from 'express';
import { User } from '../db/models/index.js';
import { unauthorized } from '../lib/errors.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { passportFor } from '../services/passportData.js';

/** The passport routes. */
export function passportRoutes(now: () => Date): Router {
  const router = Router();

  // GET /me/passport — everything, including upcoming trips and journals.
  router.get('/me/passport', requireAuth(now), async (req, res) => {
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    res.json({ passport: await passportFor(user, now(), { includeUpcoming: true, includeJournal: true }) });
  });

  return router;
}
