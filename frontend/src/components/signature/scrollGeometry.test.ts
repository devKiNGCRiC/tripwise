/**
 * scrollGeometry.test.ts — the floating scrollbar's geometry: the pill's length shows how
 * much of the page is on screen, its position shows how far down you are, it never gets
 * too small to grab, and it disappears when the page doesn't scroll.
 */
import { describe, expect, it } from 'vitest';
import { scrollFromThumb, thumbGeometry } from './scrollGeometry';

describe('thumbGeometry', () => {
  it('sizes and places the pill by how much of the page is visible and scrolled', () => {
    expect(thumbGeometry(0, 1000, 4000)).toEqual({ size: 250, offset: 0, visible: true });
    expect(thumbGeometry(3000, 1000, 4000)).toEqual({ size: 250, offset: 750, visible: true });
    expect(thumbGeometry(1500, 1000, 4000)).toEqual({ size: 250, offset: 375, visible: true });
  });

  it('keeps the pill at least 48px long on very long pages', () => {
    expect(thumbGeometry(0, 800, 80000).size).toBe(48);
    expect(thumbGeometry(79200, 800, 80000).offset).toBe(752);
  });

  it('hides when the page fits on screen', () => {
    expect(thumbGeometry(0, 1000, 1000).visible).toBe(false);
  });
});

describe('scrollFromThumb', () => {
  it('turns a dragged pill position back into a scroll position', () => {
    expect(scrollFromThumb(375, 1000, 4000)).toBe(1500);
    expect(scrollFromThumb(-50, 1000, 4000)).toBe(0);
    expect(scrollFromThumb(5000, 1000, 4000)).toBe(3000);
  });
});
