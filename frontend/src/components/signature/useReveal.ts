/**
 * useReveal.ts — scroll reveals without re-renders.
 *
 * Attach the returned ref to a section. When it first scrolls into view, it and every
 * descendant with a reveal class (`reveal-line`, `reveal-up`, `wipe`) get `.is-in`,
 * which starts their CSS transitions (see index.css). One shared IntersectionObserver
 * serves the whole app. Without IntersectionObserver (old browsers, tests) or with
 * reduced/calm motion, content is revealed immediately.
 */
import { useCallback } from 'react';
import { prefersReducedMotion } from '@/lib/usePrefersReducedMotion';

/** Elements inside a revealed section that animate in. */
const TARGETS = '.reveal-line, .reveal-up, .wipe';

/** Mark an element (and its animated descendants) as revealed. */
function reveal(el: Element) {
  el.classList.add('is-in');
  el.querySelectorAll(TARGETS).forEach((child) => child.classList.add('is-in'));
}

/** Lazily created shared observer: reveal once, then stop watching. */
let observer: IntersectionObserver | null = null;
function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        observer!.unobserve(entry.target);
      }
    },
    // Start a little before the section is fully on screen.
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  return observer;
}

/** Returns a ref callback: the element reveals itself when scrolled into view. */
export function useReveal<T extends Element>() {
  return useCallback((el: T | null) => {
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      reveal(el);
      return;
    }
    const io = getObserver();
    io.observe(el);
    // React 19: returning a function from a ref callback runs it on unmount.
    return () => io.unobserve(el);
  }, []);
}
