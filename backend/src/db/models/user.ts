/**
 * user.ts — a TripWise account.
 * Emails are stored lower-case and must be unique; only a bcrypt hash of the password is
 * kept. `plan` decides daily limits (config/plans.ts); `blocked` locks the account out.
 * The profile part (username, bio, photo…) and settings (preferences, privacy, theme)
 * power the passport and the Account tab.
 */
import { model, Schema, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { PACES, PASSPORT_VISIBILITY, TRAVELLER_TYPES, TRAVELLERS } from '../../lib/enums.js';

/** What a user looks like in the database. */
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    blocked: { type: Boolean, default: false },

    // ── Profile (shown on the passport) ──
    /** Lower-case handle, e.g. "asharao"; unique. Made at signup, changeable once a day. */
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    usernameChangedAt: { type: Date },
    bio: { type: String, default: '', maxlength: 160 },
    travellerType: { type: String, enum: [...TRAVELLER_TYPES, null], default: null },
    homeCity: { type: String, default: '', maxlength: 80 },
    /** Present when a photo is uploaded; the version changes the photo URL so caches refresh. */
    avatar: { type: new Schema({ version: { type: Number, required: true } }, { _id: false }), default: null },

    // ── Settings ──
    /** Planner defaults (any may be missing). */
    preferences: {
      type: new Schema(
        {
          budget: Number,
          interests: { type: [String], default: undefined },
          pace: { type: String, enum: [...PACES] },
          travellers: { type: String, enum: [...TRAVELLERS] },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    /** Who can see the passport, and whether journals show there. */
    privacy: {
      passport: { type: String, enum: [...PASSPORT_VISIBILITY], default: 'friends' },
      showJournal: { type: Boolean, default: true },
    },
    /** Colours read from trip photos that tint the app (null = the worlds' own colours). */
    theme: { type: Schema.Types.Mixed, default: null },
    /** Secret part of the personal invite link (/join/<code>); can be regenerated. */
    inviteCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/** Plain fields of a user. */
export type UserFields = InferSchemaType<typeof userSchema>;
/** A user loaded from the database. */
export type UserDoc = HydratedDocument<UserFields>;
/** The users collection. */
export const User = model('User', userSchema);
