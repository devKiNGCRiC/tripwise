/**
 * SmoothScroll.tsx — buttery, inertial page scrolling (Lenis), in ONE place for the whole app.
 *
 * Lenis smooths wheel and trackpad scrolling while still moving the real window scroll,
 * so native scroll events, sticky sections and IntersectionObserver keep working.
 * It runs its own animation loop (autoRaf). In-page anchor links glide too.
 * Reduced-motion users keep plain native scrolling.
 */
import Lenis from 'lenis';
import { useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';

/** Turns on smooth scrolling for everything inside it (see file header). */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, autoRaf: true, anchors: true });
    return () => lenis.destroy();
  }, [reduceMotion]);

  return <>{children}</>;
}
