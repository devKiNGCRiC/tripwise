/**
 * profile.ts (routes) — the signed-in traveller's own profile, under /api/me:
 *
 *   GET   /me/profile   → { profile }   name, @username, bio, type, home city, preferences,
 *                                       privacy, theme, invite code
 *   PATCH /me/profile   → { profile }   change any of those (only the fields sent)
 *
 * Usernames are unique ignoring case, can't be reserved words and change at most once a day.
 */
import { Router } from 'express';
import { z } from 'zod';
import { User } from '../db/models/index.js';
import { profileOf } from '../db/toPublic.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import { INTERESTS, PACES, PASSPORT_VISIBILITY, TRAVELLER_TYPES, TRAVELLERS } from '../lib/enums.js';
import { currentUser, requireAuth } from '../middleware/auth.js';
import { normalizeUsername, usernameProblem } from '../services/username.js';

/** How long between username changes. */
const USERNAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** "#rrggbb" colours (the theme palette). */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** A colour palette read from photos (same shape as the website's `Palette`). */
const paletteSchema = z.object({
  tint: hex,
  swatches: z.tuple([hex, hex, hex, hex]),
  accents: z.object({ day: z.tuple([hex, hex]), night: z.tuple([hex, hex]) }),
});

/** What may be changed; every field is optional and unknown ones are dropped. */
const patchSchema = z.object({
  name: z.string().trim().min(1, 'Please give your name').max(80, 'Please use a shorter name').optional(),
  username: z.string().optional(),
  bio: z.string().trim().max(160, 'Keep your bio under 160 characters').optional(),
  travellerType: z.enum(TRAVELLER_TYPES, { error: 'Pick a traveller type from the list' }).nullable().optional(),
  homeCity: z.string().trim().max(80, 'Keep your home city under 80 characters').optional(),
  preferences: z
    .object({
      budget: z.number().min(500, 'Budget must be at least ₹500 a day').max(200_000, 'That budget looks too high').optional(),
      interests: z.array(z.enum(INTERESTS)).max(5, 'Pick up to 5 interests').optional(),
      pace: z.enum(PACES).optional(),
      travellers: z.enum(TRAVELLERS).optional(),
    })
    .optional(),
  privacy: z
    .object({
      passport: z.enum(PASSPORT_VISIBILITY).optional(),
      showJournal: z.boolean().optional(),
    })
    .optional(),
  theme: paletteSchema.nullable().optional(),
});

/** The profile routes. */
export function profileRoutes(now: () => Date): Router {
  const router = Router();
  const auth = requireAuth(now);

  // GET /me/profile — my profile and settings.
  router.get('/me/profile', auth, async (req, res) => {
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();
    res.json({ profile: profileOf(user) });
  });

  // PATCH /me/profile — change some of it.
  router.patch('/me/profile', auth, async (req, res) => {
    const parsed = patchSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message ?? 'Please check your profile details.');
    const changes = parsed.data;
    const user = await User.findById(currentUser(req).id);
    if (!user) throw unauthorized();

    // Username: checked for shape, the daily limit and (by the unique index) clashes.
    if (changes.username !== undefined) {
      const wanted = normalizeUsername(changes.username);
      if (wanted !== user.username) {
        const problem = usernameProblem(wanted);
        if (problem) throw badRequest(problem);
        const last = user.usernameChangedAt?.getTime();
        if (last && now().getTime() - last < USERNAME_COOLDOWN_MS) throw badRequest('You can change your username once a day');
        if (await User.exists({ username: wanted })) throw conflict('That username is taken');
        user.username = wanted;
        user.usernameChangedAt = now();
      }
    }

    // Simple fields.
    if (changes.name !== undefined) user.name = changes.name;
    if (changes.bio !== undefined) user.bio = changes.bio;
    if (changes.travellerType !== undefined) user.travellerType = changes.travellerType;
    if (changes.homeCity !== undefined) user.homeCity = changes.homeCity;
    if (changes.theme !== undefined) user.theme = changes.theme;

    // Nested settings: merge so sending one part doesn't wipe the others.
    if (changes.preferences) user.set('preferences', { ...profileOf(user).preferences, ...changes.preferences });
    if (changes.privacy) user.set('privacy', { passport: user.privacy?.passport ?? 'friends', showJournal: user.privacy?.showJournal ?? true, ...changes.privacy });

    try {
      await user.save();
    } catch (error) {
      // Someone took the same username at the same moment.
      if ((error as { code?: number }).code === 11000) throw conflict('That username is taken');
      throw error;
    }
    res.json({ profile: profileOf(user) });
  });

  return router;
}
