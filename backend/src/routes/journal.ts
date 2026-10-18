/**
 * journal.ts (routes) — memories of finished trips (owner only):
 *
 *   GET    /api/itineraries/:id/journal                    → { journal }
 *   PUT    /api/itineraries/:id/journal   { rating, memory } → { journal }
 *   POST   /api/itineraries/:id/journal/photos?width&height&alt   raw image → { journal }
 *   DELETE /api/itineraries/:id/journal/photos/:photoId    → { journal }
 *   GET    /api/photos/:photoId           the photo, only for people allowed to see it
 *
 * Journals open once a trip is over. Someone else's trip, journal or photo is always 404.
 */
import { Router, type Request } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Itinerary, Journal } from '../db/models/index.js';
import { badRequest, notFound } from '../lib/errors.js';
import { currentUser, optionalViewer, requireAuth, type AuthUser } from '../middleware/auth.js';
import { imageType, rawImageBody } from '../services/images.js';
import type { PhotoStore } from '../services/photos.js';
import { signedPhotoUrl, viewerFromLink } from '../services/photoLinks.js';
import { istDay } from '../services/quota.js';

/** Largest journal photo accepted (the website resizes to 1600 px first). */
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
/** Photos per trip. */
const MAX_PHOTOS = 6;
/** The message for anything we can't accept as a photo. */
const BAD_IMAGE = 'Please choose a JPG, PNG or WebP image under 1.5 MB';

/** What a journal looks like to the website; `urlFor` makes each photo's (signed) link. */
export function publicJournal(
  itineraryId: string,
  journal: { rating?: number | null; memory?: string; photos?: { id: string; width: number; height: number; alt?: string | null }[]; updatedAt?: Date } | null,
  urlFor: (photoId: string) => string,
) {
  return {
    itineraryId,
    rating: journal?.rating ?? null,
    memory: journal?.memory ?? '',
    photos: (journal?.photos ?? []).map((p) => ({ id: p.id, url: urlFor(p.id), width: p.width, height: p.height, alt: p.alt ?? '' })),
    updatedAt: (journal?.updatedAt ?? null)?.toISOString?.() ?? null,
  };
}

/** The journal routes. `canSeeJournalOf` decides who may view a photo besides its owner. */
export function journalRoutes(deps: {
  now: () => Date;
  photos: PhotoStore;
  canSeeJournalOf: (viewerId: string | null, ownerId: string) => Promise<boolean>;
}): Router {
  const router = Router();
  const { now, photos } = deps;
  const auth = requireAuth(now);

  /** My trip with this id, or 404. */
  async function ownTrip(req: Request, user: AuthUser) {
    const id = String(req.params.id);
    if (!isValidObjectId(id)) throw notFound("We couldn't find that trip.");
    const trip = await Itinerary.findOne({ _id: id, ownerId: user.id });
    if (!trip) throw notFound("We couldn't find that trip.");
    return trip;
  }
  /** Journals open only once the trip is over. */
  function mustBeOver(trip: { request?: { endDate: string } | null }) {
    if (!trip.request || trip.request.endDate >= istDay(now())) throw badRequest("You can write about this trip once it's over");
  }

  // GET — my journal for this trip (empty if not written yet).
  router.get('/itineraries/:id/journal', auth, async (req, res) => {
    const trip = await ownTrip(req, currentUser(req));
    const journal = await Journal.findOne({ itineraryId: trip._id }).lean();
    res.json({ journal: publicJournal(trip._id.toString(), journal, (id) => signedPhotoUrl(id, currentUser(req).id, now())) });
  });

  // PUT — save the rating and memory.
  router.put('/itineraries/:id/journal', auth, async (req, res) => {
    const user = currentUser(req);
    const trip = await ownTrip(req, user);
    mustBeOver(trip);
    const body = z
      .object({
        rating: z.number().int().min(1, 'Rate it from 1 to 5 diyas').max(5, 'Rate it from 1 to 5 diyas').nullable().default(null),
        memory: z.string().trim().max(1000, 'Keep your memory under 1,000 characters').default(''),
      })
      .safeParse(req.body ?? {});
    if (!body.success) throw badRequest(body.error.issues[0]?.message ?? 'Please check your journal.');
    const journal = await Journal.findOneAndUpdate(
      { itineraryId: trip._id },
      { $set: { ...body.data, updatedAt: now() }, $setOnInsert: { ownerId: user.id } },
      { upsert: true, new: true },
    ).lean();
    res.json({ journal: publicJournal(trip._id.toString(), journal, (id) => signedPhotoUrl(id, currentUser(req).id, now())) });
  });

  // POST photos — add one photo (raw bytes; the website resized it first).
  router.post('/itineraries/:id/journal/photos', auth, rawImageBody, async (req, res) => {
    const user = currentUser(req);
    const trip = await ownTrip(req, user);
    mustBeOver(trip);
    const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const type = imageType(bytes);
    if (!type || bytes.length > MAX_PHOTO_BYTES) throw badRequest(BAD_IMAGE);
    const existing = await Journal.findOne({ itineraryId: trip._id }).lean();
    if ((existing?.photos.length ?? 0) >= MAX_PHOTOS) throw badRequest('A trip can have up to 6 photos');

    const size = (value: unknown) => Math.max(1, Math.min(10_000, Math.round(Number(value) || 1)));
    const { id } = await photos.put({ ownerId: user.id, itineraryId: trip._id.toString(), bytes, contentType: type });
    const entry = { id, width: size(req.query.width), height: size(req.query.height), alt: String(req.query.alt ?? '').slice(0, 200) };
    const journal = await Journal.findOneAndUpdate(
      { itineraryId: trip._id },
      { $push: { photos: entry }, $set: { updatedAt: now() }, $setOnInsert: { ownerId: user.id } },
      { upsert: true, new: true },
    ).lean();
    res.json({ journal: publicJournal(trip._id.toString(), journal, (id) => signedPhotoUrl(id, currentUser(req).id, now())) });
  });

  // DELETE a photo — removed from the journal and from storage.
  router.delete('/itineraries/:id/journal/photos/:photoId', auth, async (req, res) => {
    const trip = await ownTrip(req, currentUser(req));
    const photoId = String(req.params.photoId);
    const journal = await Journal.findOneAndUpdate({ itineraryId: trip._id }, { $pull: { photos: { id: photoId } }, $set: { updatedAt: now() } }, { new: true }).lean();
    if (isValidObjectId(photoId)) await photos.remove(photoId);
    res.json({ journal: publicJournal(trip._id.toString(), journal, (id) => signedPhotoUrl(id, currentUser(req).id, now())) });
  });

  // GET /photos/:photoId — the photo itself, for its owner or those allowed to see their journals.
  router.get('/photos/:photoId', async (req, res) => {
    const id = String(req.params.photoId);
    if (!isValidObjectId(id)) throw notFound();
    const photo = await photos.get(id);
    if (!photo) throw notFound();
    // Who is looking: from a signed link (as used in <img>), else from a login token.
    const linked = viewerFromLink(id, req.query, now());
    const viewer = linked !== undefined ? linked : await optionalViewer(req, now());
    if (viewer !== photo.ownerId && !(await deps.canSeeJournalOf(viewer, photo.ownerId))) throw notFound();
    res.setHeader('Content-Type', photo.contentType);
    // Private, and checked with us every time (an unchanged photo comes back as a cheap
    // "not modified"), so hiding journals or blocking someone takes effect at once.
    res.setHeader('Cache-Control', 'private, no-cache');
    res.send(photo.body);
  });

  return router;
}
