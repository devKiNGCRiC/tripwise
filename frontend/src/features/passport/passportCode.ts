/**
 * passportCode.ts — the "machine-readable" line printed along the bottom of the passport
 * cover, like a real passport: P<IND<SURNAME<<GIVEN<<USERNAME<<SINCE<MONYY, padded with <.
 * Decoration only; every part is always kept (it is never cut short).
 */

/** Three-letter months, January first. */
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Letters and digits only, other runs become "<", in capitals. */
const clean = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]+/g, '<').replace(/^<|<$/g, '');

/** Build the code line for a traveller. */
export function passportCode(name: string, username: string, joined: string): string {
  const parts = name.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts.at(-1)! : parts[0];
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  // Month spelt out by hand (browsers differ: "Sep" vs "Sept").
  const date = new Date(joined);
  const since = `${MONTHS[date.getUTCMonth()]}${String(date.getUTCFullYear()).slice(2)}`;
  return `P<IND<${clean(surname)}<<${clean(given)}<<${clean(username)}<<SINCE<${clean(since)}`.padEnd(44, '<');
}
