/**
 * toli.ts — a Toli: a group of Sahyatris planning one trip (the Sahyatra) together.
 *   members      who's in it and their role — exactly one 'sutradhar' (leader), any number
 *                of 'sah' (co-leaders) and 'sahyatri' — plus per-member Chaupal permissions
 *                (a granted message or time window, requests switched off), when they last
 *                read the chat, and a phone number and UPI ID they chose to share with this Toli
 *   inviteToken  the secret in the invite link (a new one retires the old)
 *   announcementMode  only leaders (and people they allow) write in Chaupal
 *   tripId       the Sahyatra, once planned
 *   choices      what polls decided: destination, dates, transport
 */
import { model, Schema, type InferSchemaType } from 'mongoose';

/** One member of a Toli. */
const memberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['sutradhar', 'sah', 'sahyatri'], required: true },
    joinedAt: { type: Date, required: true },
    /** May write in announcement mode until this time. */
    postUntil: { type: Date, default: null },
    /** May write exactly one message in announcement mode. */
    oneMessage: { type: Boolean, default: false },
    /** Leaders switched off this member's raise-hand requests. */
    requestsOff: { type: Boolean, default: false },
    /** When they last opened Chaupal (for the unread count). */
    lastReadAt: { type: Date },
    /** "+91XXXXXXXXXX", shared with this Toli only (for the Call button). */
    phone: { type: String },
    /** A UPI ID ("name@bank"), shared with this Toli only (for "Pay with UPI"). */
    upi: { type: String },
  },
  { _id: false },
);

/** What the Toli's polls decided. */
const choicesSchema = new Schema({ destination: String, startDate: String, endDate: String, transport: String }, { _id: false });

/** A Toli. */
const toliSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['friends', 'family', 'college', 'office'], required: true },
    announcementMode: { type: Boolean, default: false },
    tripId: { type: String, default: null },
    inviteToken: { type: String, required: true, unique: true },
    members: { type: [memberSchema], default: [] },
    choices: { type: choicesSchema, default: () => ({}) },
  },
  { timestamps: true, versionKey: false },
);
// "My Tolis" looks members up by user.
toliSchema.index({ 'members.userId': 1 });

/** Plain fields of a Toli. */
export type ToliFields = InferSchemaType<typeof toliSchema>;
/** The tolis collection. */
export const Toli = model('Toli', toliSchema);
/** A loaded Toli. */
export type ToliDoc = ReturnType<(typeof Toli)['hydrate']>;
