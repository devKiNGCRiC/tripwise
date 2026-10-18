/**
 * user.ts — a TripWise account.
 * Emails are stored lower-case and must be unique; only a bcrypt hash of the password is
 * kept. `plan` decides daily limits (config/plans.ts); `blocked` locks the account out.
 */
import { model, Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** What a user looks like in the database. */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    blocked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/** Plain fields of a user. */
export type UserFields = InferSchemaType<typeof userSchema>;
/** A user loaded from the database. */
export type UserDoc = HydratedDocument<UserFields>;
/** The users collection. */
export const User = model('User', userSchema);
