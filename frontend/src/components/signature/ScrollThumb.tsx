/**
 * ScrollThumb.tsx — TripWise's own scrollbar: a slim pill in the region colour that floats
 * over the living landscape (the browser's scrollbar, which always reserves a pale strip
 * at the window edge, is hidden in index.css). It appears while you scroll or hover near
 * the edge, fades away when idle, and can be dragged like a normal scrollbar.
 * Mouse/trackpad screens only — touch screens show their own overlay scrollbars.
 */
import { useEffect, useRef } from 'react';
import { scrollFromThumb, thumbGeometry } from './scrollGeometry';

/** How long the pill stays visible after the last scroll (ms). */
const IDLE_MS = 1200;

/** The floating, draggable scroll pill. */
export function ScrollThumb() {
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thumb = thumbRef.current;
    if (!thumb || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    let idle = 0;
    let frame = 0;
    let drag: { startY: number; startOffset: number } | null = null;
    const page = () => document.documentElement.scrollHeight;

    /** Size and place the pill for the current scroll position. */
    function place() {
      frame = 0;
      const g = thumbGeometry(window.scrollY, window.innerHeight, page());
      thumb!.style.display = g.visible ? 'block' : 'none';
      thumb!.style.height = `${g.size}px`;
      thumb!.style.transform = `translateY(${g.offset}px)`;
    }
    /** Show the pill, and schedule it to fade when things go quiet. */
    function wake() {
      thumb!.dataset.active = 'true';
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (!drag) thumb!.dataset.active = 'false';
      }, IDLE_MS);
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(place);
      wake();
    };
    /** Show the pill when the pointer comes near the right edge. */
    const onMove = (event: PointerEvent) => {
      if (window.innerWidth - event.clientX < 24) wake();
    };
    /** Dragging: the pill follows the pointer and the page scrolls with it. */
    const onDown = (event: PointerEvent) => {
      const offset = new DOMMatrixReadOnly(getComputedStyle(thumb!).transform).m42;
      drag = { startY: event.clientY, startOffset: offset };
      thumb!.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const onDrag = (event: PointerEvent) => {
      if (!drag) return;
      const offset = drag.startOffset + event.clientY - drag.startY;
      window.scrollTo({ top: scrollFromThumb(offset, window.innerHeight, page()), behavior: 'instant' });
    };
    const onUp = () => {
      drag = null;
      wake();
    };

    place();
    const sizes = new ResizeObserver(() => place());
    sizes.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', place);
    window.addEventListener('pointermove', onMove);
    thumb.addEventListener('pointerdown', onDown);
    thumb.addEventListener('pointermove', onDrag);
    thumb.addEventListener('pointerup', onUp);
    thumb.addEventListener('pointercancel', onUp);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      sizes.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', place);
      window.removeEventListener('pointermove', onMove);
      thumb.removeEventListener('pointerdown', onDown);
      thumb.removeEventListener('pointermove', onDrag);
      thumb.removeEventListener('pointerup', onUp);
      thumb.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed top-0 right-1 bottom-0 z-[60] hidden w-2.5 [@media(hover:hover)_and_(pointer:fine)]:block">
      <div
        ref={thumbRef}
        data-active="false"
        className="pointer-events-auto absolute top-0 right-0 w-full cursor-grab rounded-full bg-accent opacity-0 shadow-[0_2px_10px_-2px_rgb(0_0_0/.35)] transition-[opacity,width] duration-300 hover:w-3.5 active:cursor-grabbing data-[active=true]:opacity-90"
        style={{ display: 'none' }}
      />
    </div>
  );
}
