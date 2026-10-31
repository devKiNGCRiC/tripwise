/**
 * images.ts — request right-sized images.
 * Unsplash's CDN resizes on the fly via URL params, and Wikimedia Commons serves thumbnails
 * at a few standard widths, so phones download small files (big win for the < 3s load
 * target). Other hosts are left as-is.
 */

/** Thumbnail widths Wikimedia Commons serves (and caches) for every photo. */
const WIKIMEDIA_WIDTHS = [250, 330, 500, 960, 1280];

/** The photo at roughly `width` pixels wide. */
export function sizedImage(url: string, width: number): string {
  if (url.startsWith('https://images.unsplash.com/')) return `${url}?auto=format&fit=crop&w=${width}&q=70`;
  // ".../thumb/a/ab/File.jpg/1280px-File.jpg" → the smallest standard width that's wide enough.
  if (/^https:\/\/(thumb|upload)\.wikimedia\.org\/.*\/\d+px-[^/]+$/.test(url)) {
    const best = WIKIMEDIA_WIDTHS.find((w) => w >= width) ?? WIKIMEDIA_WIDTHS[WIKIMEDIA_WIDTHS.length - 1];
    return url.replace(/\/\d+px-([^/]+)$/, `/${best}px-$1`);
  }
  return url;
}
