/**
 * poll.ts — a Toli's poll: where to go (destination), when (Tithi — several dates may be
 * picked), how to travel (transport) or any question (free). Votes are option ids by user
 * id; a closed poll keeps its winner, which is also written to the Toli's `choices`.
 */
import { model, Schema } from 'mongoose';

/** One option. */
const optionSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    /** Destination polls: the catalogue slug when TripWise knows the place. */
    destination: { type: String },
    /** Tithi polls: the dates. */
    start: { type: String },
    end: { type: String },
    /** Transport polls: the mode. */
    mode: { type: String },
  },
  { _id: false },
);

/** One poll. */
const pollSchema = new Schema(
  {
    toliId: { type: String, required: true },
    authorId: { type: String, required: true },
    kind: { type: String, enum: ['destination', 'tithi', 'transport', 'free'], required: true },
    question: { type: String, required: true },
    options: { type: [optionSchema], required: true },
    /** Several options may be picked (Tithi). */
    multi: { type: Boolean, default: false },
    closesAt: { type: Date },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    winner: { type: String },
    votes: { type: Map, of: [String], default: () => new Map() },
  },
  { timestamps: true, versionKey: false },
);
// A Toli's polls, newest first.
pollSchema.index({ toliId: 1, createdAt: -1 });

/** The polls collection. */
export const Poll = model('Poll', pollSchema);
