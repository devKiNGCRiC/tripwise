/**
 * CursorRing.tsx — a thin gold ring that trails the mouse pointer and swells over
 * anything you can press. A finishing touch for desktop only: it never renders on
 * touch screens, and stays off for people who prefer reduced motion.
 * Moves via style transforms in requestAnimationFrame (no React re-renders).
 */
import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';

/** What counts as "pressable" (the ring grows over these). */
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"]';
/** How quickly the ring catches up with the pointer each frame (0–1). */
const FOLLOW = 0.22;

/** True for a real mouse/trackpad (hover + precise pointer). */
function hasFinePointer() {
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
}

export function CursorRing() {
  const ringRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring || reduceMotion || !hasFinePointer()) return;
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;

    /** Track the pointer and whether it's over something pressable. */
    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      ring.dataset.active = 'true';
      const over = event.target instanceof Element && event.target.closest(INTERACTIVE);
      ring.dataset.big = over ? 'true' : 'false';
    };
    /** Hide when the pointer leaves the window. */
    const onLeave = () => {
      ring.dataset.active = 'false';
    };
    /** Ease toward the pointer every frame. */
    const tick = () => {
      frame = requestAnimationFrame(tick);
      pos.x += (target.x - pos.x) * FOLLOW;
      pos.y += (target.y - pos.y) * FOLLOW;
      ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={ringRef}
      aria-hidden
      data-active="false"
      className="group pointer-events-none fixed top-0 left-0 z-[100] hidden [@media(hover:hover)_and_(pointer:fine)]:block"
    >
      {/* Inner ring does the sizing so the outer transform stays a pure translate. */}
      <span className="block size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-gold opacity-0 transition-[width,height,background-color,opacity] duration-300 ease-out-expo group-data-[active=true]:opacity-100 group-data-[big=true]:size-16 group-data-[big=true]:bg-gold/10" />
    </div>
  );
}
