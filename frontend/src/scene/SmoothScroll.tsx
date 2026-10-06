/**
 * SmoothScroll.tsx — buttery, inertial page scrolling (Lenis) wired to GSAP's
 * ScrollTrigger, in ONE place for the whole app.
 *
 * Why both: Lenis smooths the wheel/touch scroll; GSAP ScrollTrigger maps scroll
 * position to animations (the 3D camera descent, panel reveals). Lenis tells
 * ScrollTrigger on every scroll tick, and GSAP's ticker drives Lenis, so they
 * never fight each other. Reduced-motion users keep plain native scrolling.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/** Turns on smooth scrolling for everything inside it (see file header). */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    /** GSAP's ticker gives seconds; Lenis wants milliseconds. */
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP's defaults
      lenis.destroy();
    };
  }, [reduceMotion]);

  return <>{children}</>;
}
