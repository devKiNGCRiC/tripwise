/**
 * credit.test.ts — photo authors from Wikimedia Commons, cleaned for a short credit line:
 * HTML and extra spaces go, "This photo was taken by X. Feel free…" becomes "X" (keeping
 * initials like "A."), long names are shortened, and placeholder authors ("No
 * machine-readable author provided") count as no author — so the photo isn't used.
 */
import { describe, expect, it } from 'vitest';
import { cleanAuthor } from '../scripts/catalogue/credit.js';

describe('cleanAuthor', () => {
  it('keeps plain names and strips HTML', () => {
    expect(cleanAuthor('<a href="//commons.wikimedia.org/wiki/User:Sailko">Sailko</a>')).toBe('Sailko');
    expect(cleanAuthor('  Ms   Sarah Welch ')).toBe('Ms Sarah Welch');
  });

  it('turns sentence credits into the name, keeping initials', () => {
    expect(cleanAuthor('This Photo was taken by Timothy A. Gonsalves. Feel free to use my photos, but please credit me.')).toBe('Timothy A. Gonsalves');
    expect(cleanAuthor('Photo by Ramesh NG')).toBe('Ramesh NG');
    expect(cleanAuthor('Timothy A. Gonsalves . Feel free to use my photos')).toBe('Timothy A. Gonsalves');
  });

  it('shortens very long credits', () => {
    const long = cleanAuthor('A'.repeat(30) + ' ' + 'B'.repeat(40))!;
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith('…')).toBe(true);
  });

  it('treats placeholders and blanks as no author', () => {
    expect(cleanAuthor('No machine-readable author provided. Imc assumed (based on copyright claims).')).toBeNull();
    expect(cleanAuthor('Unknown author')).toBeNull();
    expect(cleanAuthor('   ')).toBeNull();
  });
});
