/**
 * useReveal.ts — content glides up and fades in as it scrolls into view
 * (GSAP ScrollTrigger), and eases back out if you scroll back up.
 * Attach the returned ref to the element. Does nothing for reduced-motion users.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

gsap.registerPlugin(ScrollTrigger);

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
    // gsap.context scopes the tween so cleanup reverts it completely (StrictMode-safe).
    const ctx = gsap.context(() => {
      gsap.from(el, {
        y: 70,
        opacity: 0,
        scale: 0.97,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
      });
    });
    return () => ctx.revert();
  }, [reduceMotion]);

  return ref;
}
