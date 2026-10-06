/**
 * useTilt.ts — makes an element lean toward the pointer in 3D, with a light
 * "shine" that follows the cursor. Used by destination postcards.
 *
 * It writes CSS variables (--rx, --ry, --mx, --my) instead of React state, so
 * moving the mouse never re-renders the component. Does nothing when the user
 * prefers reduced motion.
 */
import { useCallback, type PointerEvent } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Max lean in degrees (left/right, up/down). */
const MAX_Y = 16;
const MAX_X = 12;

export function useTilt() {
  const reduceMotion = usePrefersReducedMotion();

  /** Lean toward the pointer and move the shine under it. */
  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (reduceMotion || event.pointerType === 'touch') return;
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      el.style.setProperty('--ry', `${(px - 0.5) * MAX_Y}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * MAX_X}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    },
    [reduceMotion],
  );

  /** Settle back flat when the pointer leaves. */
  const onPointerLeave = useCallback((event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  }, []);

  return { onPointerMove, onPointerLeave };
}
