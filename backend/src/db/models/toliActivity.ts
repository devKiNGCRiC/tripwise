/**
 * toliActivity.ts — what happened in a Toli, for its activity feed: who did what and when
 * ("Kabir joined", "Asha approved Zoya's suggestion"). `data` holds the details each kind
 * of event needs (names, ids).
 */
import { model, Schema } from 'mongoose';

/** One event in a Toli. */
const toliActivitySchema = new Schema(
  {
    toliId: { type: String, required: true },
    actorId: { type: String, required: true },
    type: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);
// The feed reads a Toli's newest events first.
toliActivitySchema.index({ toliId: 1, at: -1 });

/** The toli activity collection. */
export const ToliActivity = model('ToliActivity', toliActivitySchema);
