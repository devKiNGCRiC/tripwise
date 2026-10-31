/**
 * format.test.ts — money, season and image-URL helpers.
 */
import { describe, expect, it } from 'vitest';
import { formatMoney, formatSeason } from './format';
import { sizedImage } from './images';

describe('formatMoney', () => {
  it('formats INR with Indian digit grouping and no decimals', () => {
    expect(formatMoney({ amount: 125000, currency: 'INR' })).toBe('₹1,25,000');
  });
});

describe('formatSeason', () => {
  it('joins a run of months, even across the new year', () => {
    expect(formatSeason([11, 12, 1, 2, 3])).toBe('Nov – Mar');
  });

  it('lists separate runs and single months', () => {
    expect(formatSeason([3, 4, 5, 6, 10])).toBe('Mar – Jun, Oct');
  });

  it('says "All year" for every month and nothing for none', () => {
    expect(formatSeason([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe('All year');
    expect(formatSeason([])).toBe('');
  });
});

describe('sizedImage', () => {
  it('adds width/quality params to Unsplash URLs', () => {
    expect(sizedImage('https://images.unsplash.com/photo-1', 800)).toBe(
      'https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800&q=70',
    );
  });

  it('leaves other URLs untouched', () => {
    expect(sizedImage('https://example.com/a.jpg', 800)).toBe('https://example.com/a.jpg');
  });

  it("asks Wikimedia for the smallest standard thumbnail that's wide enough", () => {
    const url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Lakshman_Jhula.jpg/1280px-Lakshman_Jhula.jpg';
    expect(sizedImage(url, 400)).toBe('https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/Lakshman_Jhula.jpg/500px-Lakshman_Jhula.jpg');
    expect(sizedImage(url, 250)).toContain('/250px-');
    expect(sizedImage(url, 1400)).toContain('/1280px-');
  });
});
