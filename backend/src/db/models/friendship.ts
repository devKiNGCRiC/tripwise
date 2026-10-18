/**
 * friendship.ts — a friend request or a friendship between two travellers.
 * `pair` is the two user ids sorted and joined ("a|b"), so there is only ever one record
 * per pair: "pending" while waiting for the recipient, "accepted" once they are friends.
 */
import { model, Schema } from 'mongoose';

/** One request or friendship. */
const friendshipSchema = new Schema({
  pair: { type: String, required: true, unique: true },
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'accepted'], required: true },
  createdAt: { type: Date, required: true },
  acceptedAt: { type: Date },
});

/** The friendships collection. */
export const Friendship = model('Friendship', friendshipSchema);
