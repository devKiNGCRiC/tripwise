/**
 * credit.ts (catalogue) — a photo author from Wikimedia Commons, cleaned for a short credit
 * line. Commons' "Artist" field can hold HTML, whole sentences ("This photo was taken by …
 * Feel free to use my photos …") or a placeholder when nobody is named; a placeholder counts
 * as no author, so the import script leaves that photo out (never shown uncredited).
 */

/** Longest credit name we show. */
const MAX = 60;
/** Author texts that mean "nobody is named". */
const PLACEHOLDER = /no machine-readable author|unknown author|^unknown$|^anonymous$/i;
/** Lead-in words before the actual name. */
const LEAD_IN = /^(?:this\s+)?(?:photo(?:graph)?|picture|image)?\s*(?:was\s+)?(?:taken|shot|photographed|clicked)?\s*by\s+/i;

/** The author's name for a credit line, or null when there isn't a real one. */
export function cleanAuthor(raw: string): string | null {
  let text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || PLACEHOLDER.test(text)) return null;
  text = text.replace(LEAD_IN, '');
  // Keep the first sentence: up to a full stop after a real word (so "A." initials stay),
  // even with a stray space before the stop ("Gonsalves . Feel free…").
  const sentence = /^(.*?[A-Za-z]{2,})\s?\.\s/.exec(text);
  if (sentence) text = sentence[1];
  if (text.length > MAX) text = `${text.slice(0, MAX - 1).trimEnd()}…`;
  return text || null;
}
