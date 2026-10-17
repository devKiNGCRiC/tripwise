/**
 * scrollGeometry.ts — maths for TripWise's own floating scrollbar.
 *   thumbGeometry   → how long the pill is and where it sits, for a scroll position
 *   scrollFromThumb → the scroll position for a pill dragged to a given offset
 * The pill's length is the share of the page on screen (never under 48px, so it can
 * always be grabbed); the track is the full height of the window.
 */

/** Shortest the pill may get, in px. */
const MIN_SIZE = 48;

/** Pill length for a window `view` px tall over a page `page` px tall. */
function pillSize(view: number, page: number) {
  return Math.max(MIN_SIZE, Math.round((view * view) / page));
}

/** Pill length and top offset (px) for scroll position `scrollY`; hidden when nothing scrolls. */
export function thumbGeometry(scrollY: number, view: number, page: number) {
  if (page <= view + 1) return { size: 0, offset: 0, visible: false };
  const size = pillSize(view, page);
  const progress = Math.min(1, Math.max(0, scrollY / (page - view)));
  return { size, offset: Math.round(progress * (view - size)), visible: true };
}

/** Scroll position (px) for the pill dragged to top offset `offset` (clamped to the page). */
export function scrollFromThumb(offset: number, view: number, page: number) {
  const size = pillSize(view, page);
  const progress = Math.min(1, Math.max(0, offset / Math.max(1, view - size)));
  return Math.round(progress * (page - view));
}
