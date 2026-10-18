/**
 * passwordReset.ts — one "forgot password" link.
 * Only a SHA-256 hash of the link's token is kept; it works once, for 30 minutes, then the
 * record deletes itself.
 */
import { model, Schema } from 'mongoose';

/** A reset link waiting to be used. */
const passwordResetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  usedAt: { type: Date },
});

/** The password_resets collection. */
export const PasswordReset = model('PasswordReset', passwordResetSchema, 'password_resets');
