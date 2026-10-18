/**
 * photo.ts — one journal photo's record. The picture itself is either right here (`data`,
 * while Cloudinary isn't set up) or private on Cloudinary (`cloudinaryId`). Either way it is
 * only ever shown through GET /api/photos/:id, which checks who may see it.
 */
import { model, Schema } from 'mongoose';

/** A stored journal photo. */
const photoSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itineraryId: { type: Schema.Types.ObjectId, ref: 'Itinerary', required: true },
  contentType: { type: String, required: true },
  data: { type: Buffer },
  cloudinaryId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

/** The photos collection. */
export const Photo = model('Photo', photoSchema);
