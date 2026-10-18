/**
 * block.ts — one traveller blocking another. A block hides each of them from the other
 * (no requests, no card, no passport, no photos), whatever their privacy settings.
 */
import { model, Schema } from 'mongoose';

/** One block. */
const blockSchema = new Schema({
  blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// One block per direction.
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

/** The blocks collection. */
export const Block = model('Block', blockSchema);
