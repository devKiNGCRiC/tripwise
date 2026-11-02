/**
 * toliLocation.ts — where a Sahyatri is, shared with their Toli by their own choice and only for
 * a while. Only the last known point is kept (no history); MongoDB removes it by itself when
 * `until` passes (TTL index), and it is deleted at once when they stop sharing or leave.
 */
import { model, Schema } from 'mongoose';

/** One sharer's last known point in one Toli. */
const toliLocationSchema = new Schema(
  {
    toliId: { type: String, required: true },
    userId: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    /** Metres, as the phone reported it. */
    accuracy: { type: Number },
    /** When this point was taken. */
    at: { type: Date, required: true },
    /** When sharing ends (the record disappears then). */
    until: { type: Date, required: true },
  },
  { versionKey: false },
);
// One point per person per Toli; gone when sharing ends.
toliLocationSchema.index({ toliId: 1, userId: 1 }, { unique: true });
toliLocationSchema.index({ until: 1 }, { expireAfterSeconds: 0 });

/** The shared-locations collection. */
export const ToliLocation = model('ToliLocation', toliLocationSchema);
