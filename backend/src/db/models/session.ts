/**
 * session.ts — one "stay logged in" token (the refresh cookie).
 *
 * Only a SHA-256 hash of the token is stored, so a database leak can't be used to log in.
 * Every refresh replaces the token with a new one in the same `familyId`; the old one is
 * marked `rotatedAt`. Seeing an old token again much later means it was stolen, so the
 * whole family is revoked (services/sessions.ts). Expired sessions delete themselves (TTL).
 */
import { model, Schema, type InferSchemaType } from 'mongoose';

/** What a session looks like in the database. */
const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  familyId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  /** When this token was swapped for a newer one (still briefly accepted, see sessions.ts). */
  rotatedAt: { type: Date },
  /** When this token was cancelled (logout or theft detected). */
  revokedAt: { type: Date },
});

/** Plain fields of a session. */
export type SessionFields = InferSchemaType<typeof sessionSchema>;
/** The sessions collection. */
export const Session = model('Session', sessionSchema);
