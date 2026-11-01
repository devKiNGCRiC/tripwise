/**
 * chaupal.ts (service) — a Toli's chat (Chaupal), shared by its routes and other features:
 *   postCard         a new suggestion or poll appears in the chat as a live trip card
 *   messageViews     messages as a member sees them (author, reply preview, signed photo
 *                    links made for that member, a short title for each card)
 *   canSeeChatPhoto  may this person see a photo? (yes when it's in the chat of a Toli they're in)
 *   unreadCount      messages from others since the member last read the chat
 */
import { Itinerary, Message, Poll, Sujhav, Toli, User } from '../db/models/index.js';
import { avatarUrl } from '../db/toPublic.js';
import { signedPhotoUrl } from './photoLinks.js';

/** A trip card in the chat. */
export interface ChatCard {
  type: 'sujhav' | 'poll' | 'place' | 'plan';
  id: string;
}

/** Characters of the replied-to message shown in a reply. */
const REPLY_PREVIEW = 80;

/** Post a card into the Toli's chat on someone's behalf (once per card). */
export async function postCard(toliId: string, authorId: string, card: ChatCard, at: Date): Promise<void> {
  await Message.updateOne(
    { toliId, authorId, clientId: `card:${card.type}:${card.id}` },
    { $setOnInsert: { toliId, authorId, clientId: `card:${card.type}:${card.id}`, card, text: '', createdAt: at } },
    { upsert: true },
  );
}

/** A short title for a card ("Suggestion: add a day", the poll's question, the plan's title). */
async function cardTitles(cards: ChatCard[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const ids = (type: ChatCard['type']) => cards.filter((c) => c.type === type).map((c) => c.id);
  const KIND_WORDS: Record<string, string> = {
    'add-stop': 'add a stop',
    'remove-stop': 'remove a stop',
    'swap-stop': 'swap a stop',
    'move-stop': 'move a stop',
    'retheme-day': 'change a day',
    'add-day': 'add a day',
    'change-transport': 'change transport',
  };
  for (const s of await Sujhav.find({ _id: { $in: ids('sujhav') } }, { change: 1 }).lean()) titles.set(`sujhav:${s._id}`, `Suggestion: ${KIND_WORDS[(s.change as { kind: string }).kind] ?? 'a change'}`);
  for (const p of await Poll.find({ _id: { $in: ids('poll') } }, { question: 1 }).lean()) titles.set(`poll:${p._id}`, p.question);
  for (const t of await Itinerary.find({ _id: { $in: ids('plan') } }, { title: 1 }).lean()) titles.set(`plan:${t._id}`, t.title);
  return titles;
}

/** Messages as `viewerId` sees them (in the order given). */
export async function messageViews(messages: InstanceType<typeof Message>[], viewerId: string, now: Date) {
  const replyIds = messages.flatMap((m) => (m.replyTo ? [m.replyTo] : []));
  const replies = await Message.find({ _id: { $in: replyIds } }, { text: 1, authorId: 1 }).lean();
  const people = await User.find({ _id: { $in: [...new Set([...messages.map((m) => m.authorId), ...replies.map((r) => r.authorId)])] } }, { name: 1, username: 1, avatar: 1 }).lean();
  const person = (id: string) => people.find((p) => p._id.toString() === id);
  const titles = await cardTitles(messages.flatMap((m) => (m.card?.type && m.card.id ? [m.card as ChatCard] : [])));

  return messages.map((m) => {
    const author = person(m.authorId);
    const reply = m.replyTo ? replies.find((r) => r._id.toString() === m.replyTo) : undefined;
    return {
      id: m._id.toString(),
      author: author
        ? { id: author._id.toString(), name: author.name, username: author.username ?? '', ...(author.avatar ? { avatarUrl: avatarUrl(author._id.toString(), author.avatar.version) } : {}) }
        : { id: m.authorId, name: 'Former Sahyatri', username: '' },
      text: m.text,
      ...(reply ? { replyTo: { id: reply._id.toString(), text: reply.text.slice(0, REPLY_PREVIEW), authorName: person(reply.authorId)?.name ?? 'Former Sahyatri' } } : {}),
      mentions: m.mentions,
      ...(m.card?.type && m.card.id ? { card: { type: m.card.type, id: m.card.id, title: titles.get(`${m.card.type}:${m.card.id}`) ?? '' } } : {}),
      photos: m.photoIds.map((id) => ({ id, url: signedPhotoUrl(id, viewerId, now) })),
      clientId: m.clientId,
      createdAt: m.createdAt.toISOString(),
    };
  });
}

/** May this person see a photo? Yes when it was shared in the chat of a Toli they're in. */
export async function canSeeChatPhoto(viewerId: string | null, photoId: string): Promise<boolean> {
  if (!viewerId) return false;
  const shared = await Message.find({ photoIds: photoId }, { toliId: 1 }).lean();
  if (!shared.length) return false;
  return !!(await Toli.exists({ _id: { $in: shared.map((m) => m.toliId) }, 'members.userId': viewerId }));
}

/** Messages from others since `since`. */
export async function unreadCount(toliId: string, viewerId: string, since: Date): Promise<number> {
  return Message.countDocuments({ toliId, authorId: { $ne: viewerId }, createdAt: { $gt: since } });
}
