/**
 * avatar.ts — a traveller's profile photo, stored right in MongoDB.
 * Photos are cropped and shrunk in the browser first (256×256, about 20 KB), so keeping
 * them in the database is free and needs no extra service.
 */
import { model, Schema } from 'mongoose';

/** One profile photo per user. */
const avatarSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

/** The avatars collection. */
export const Avatar = model('Avatar', avatarSchema);
