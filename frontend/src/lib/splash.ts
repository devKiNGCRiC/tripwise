/**
 * splash.ts — takes away the splash screen once the app has started. The splash itself is drawn
 * by index.html (so it shows before any script loads): the TripWise mark, name and slogan on the
 * brand paper. It fades out, then leaves the page; with calm motion (Passport setting) or the
 * system's reduced-motion setting it simply goes.
 */

/** How long the fade-out takes (keep in step with the #splash style in index.html). */
const FADE_MS = 350;

/** Remove the splash screen, if it is there. */
export function hideSplash(): void {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const calm = document.documentElement.dataset.motion === 'calm' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (calm) {
    splash.remove();
    return;
  }
  splash.classList.add('is-leaving');
  window.setTimeout(() => splash.remove(), FADE_MS + 50);
}
