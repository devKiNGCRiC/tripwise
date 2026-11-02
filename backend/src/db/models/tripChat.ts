/**
 * tripChat.ts — one person's Ask TripWise conversation about one trip. Private to that person,
 * even on a Toli's shared trip. Only the last 30 messages are kept.
 */
import { model, Schema } from 'mongoose';

/** One message (a question, or TripWise's answer). */
const chatMessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    /** Catalogue place ids the answer mentions. */
    placeIds: { type: [String], default: undefined },
    followUps: { type: [String], default: undefined },
    /** The answer used MET Norway's forecast (credit shown). */
    weather: { type: Boolean },
    at: { type: Date, required: true },
  },
  { _id: false },
);

/** The conversation. */
const tripChatSchema = new Schema(
  {
    tripId: { type: String, required: true },
    userId: { type: String, required: true },
    messages: { type: [chatMessageSchema], default: [] },
  },
  { versionKey: false },
);
// One conversation per person per trip.
tripChatSchema.index({ tripId: 1, userId: 1 }, { unique: true });

/** The conversations collection. */
export const TripChat = model('TripChat', tripChatSchema);
