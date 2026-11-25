/**
 * images.test.ts — right-sized photos:
 *   - Wikimedia thumbnails are asked for at their standard widths
 *   - a size list (srcset) offers a small and a large copy, so the browser downloads only what
 *     the screen needs; hosts we can't resize give no list
 */
import { describe, expect, it } from 'vitest';
import { imageSrcSet, sizedImage } from './images';

const WIKI = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/Haflong_Lake.jpg/1280px-Haflong_Lake.jpg';

describe('sizedImage', () => {
  it('picks the smallest standard Wikimedia width that is wide enough', () => {
    expect(sizedImage(WIKI, 400)).toContain('/500px-Haflong_Lake.jpg');
    expect(sizedImage(WIKI, 1000)).toContain('/1280px-Haflong_Lake.jpg');
  });
});

describe('imageSrcSet', () => {
  it('offers a small and a large copy', () => {
    expect(imageSrcSet(WIKI, [500, 960])).toBe(`${WIKI.replace('1280px', '500px')} 500w, ${WIKI.replace('1280px', '960px')} 960w`);
    expect(imageSrcSet('https://images.unsplash.com/photo-1', [500, 960])).toBe(
      'https://images.unsplash.com/photo-1?auto=format&fit=crop&w=500&q=70 500w, https://images.unsplash.com/photo-1?auto=format&fit=crop&w=960&q=70 960w',
    );
  });

  it('gives no list for a host it cannot resize', () => {
    expect(imageSrcSet('https://example.com/a.jpg', [500, 960])).toBeUndefined();
  });
});
