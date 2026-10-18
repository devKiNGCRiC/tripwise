/**
 * me.ts (routes) — the signed-in traveller's own account data:
 *
 *   GET /api/me/quota → { quota }   today's AI plans used, the limit and when it resets
 */
import { Router } from 'express';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { getQuota } from '../services/quota.js';

/** The "me" routes. `now` is the app's clock. */
export function meRoutes(now: () => Date): Router {
  const router = Router();

  // GET /me/quota — today's allowance.
  router.get('/me/quota', requireAuth(now), async (req, res) => {
    const user = currentUser(req);
    res.json({ quota: await getQuota(user.id, user.plan, now()) });
  });

  return router;
}
