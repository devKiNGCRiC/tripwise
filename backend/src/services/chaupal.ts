/**
 * chaupal.ts (service) — posting into a Toli's chat (Chaupal) from other features: a new
 * suggestion or poll appears in the chat as a live card. (The chat itself arrives with the
 * Chaupal routes; until then cards are simply not posted.)
 */

/** A trip card in the chat. */
export interface ChatCard {
  type: 'sujhav' | 'poll' | 'place' | 'plan';
  id: string;
}

/** Post a card into the Toli's chat on someone's behalf. */
export async function postCard(_toliId: string, _authorId: string, _card: ChatCard, _at: Date): Promise<void> {
  // Filled in by the Chaupal task.
}
