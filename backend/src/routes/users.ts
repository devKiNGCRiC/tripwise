/**
 * users.ts (routes) — someone's public passport (login optional):
 *
 *   GET /api/users/:username/passport → { passport, relation }
 *
 * Shown only if the owner's privacy allows it for this viewer (see services/social.ts).
 * Upcoming trips never appear here (nobody should learn when your home is empty), and
 * journals only if the owner shows them. Private, blocked and unknown all answer the same
 * 404 "This passport is private".
 */
import { Router } from 'express';
import { User } from '../db/models/index.js';
import { notFound } from '../lib/errors.js';
import { optionalViewer } from '../middleware/auth.js';
import { passportFor } from '../services/passportData.js';
import { canSeeJournalOf, canSeePassport, relation } from '../services/social.js';
import { normalizeUsername } from '../services/username.js';

/** The public user routes. */
export function userRoutes(now: () => Date): Router {
  const router = Router();

  // GET /users/:username/passport — someone's passport, as their privacy allows.
  router.get('/users/:username/passport', async (req, res) => {
    const owner = await User.findOne({ username: normalizeUsername(String(req.params.username)) });
    const viewer = await optionalViewer(req, now());
    if (!owner || owner.blocked || !(await canSeePassport(viewer, owner))) throw notFound('This passport is private');
    const ownerId = owner._id.toString();
    const passport = await passportFor(owner, now(), { includeUpcoming: false, includeJournal: await canSeeJournalOf(viewer, ownerId) });
    res.json({ passport, relation: await relation(viewer, ownerId) });
  });

  return router;
}
