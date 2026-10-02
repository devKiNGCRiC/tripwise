/**
 * format.test.ts — money and image-URL helpers.
 */
import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';
import { sizedImage } from './images';

describe('formatMoney', () => {
  it('formats INR with Indian digit grouping and no decimals', () => {
    expect(formatMoney({ amount: 125000, currency: 'INR' })).toBe('₹1,25,000');
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
});
