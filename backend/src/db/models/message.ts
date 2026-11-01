/**
 * message.ts — one message in a Toli's chat (Chaupal): text, an optional reply, the members
 * it @mentions, photos, and an optional trip card (a suggestion, poll, place or the plan).
 * `clientId` is made on the phone, so a message re-sent after an offline retry is stored once.
 */
import { model, Schema } from 'mongoose';

/** A trip card ("type" is a field name here, so it needs its own schema). */
const cardSchema = new Schema({ type: { type: String, required: true }, id: { type: String, required: true } }, { _id: false });

/** One message. */
const messageSchema = new Schema(
  {
    toliId: { type: String, required: true },
    authorId: { type: String, required: true },
    text: { type: String, default: '' },
    replyTo: { type: String },
    mentions: { type: [String], default: [] },
    card: { type: cardSchema, default: undefined },
    photoIds: { type: [String], default: [] },
    clientId: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// Reading a Toli's chat in order; one copy of each phone-made message.
messageSchema.index({ toliId: 1, createdAt: 1 });
messageSchema.index({ toliId: 1, authorId: 1, clientId: 1 }, { unique: true });
// Finding which chat a photo was shared in (to check who may see it).
messageSchema.index({ photoIds: 1 });

/** The messages collection. */
export const Message = model('Message', messageSchema);
