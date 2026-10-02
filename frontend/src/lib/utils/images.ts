/**
 * images.ts — request right-sized images.
 * Unsplash's CDN resizes on the fly via URL params, so phones download small
 * files (big win for the < 3s load target). Other hosts are left as-is.
 */
export function sizedImage(url: string, width: number): string {
  if (!url.startsWith('https://images.unsplash.com/')) return url;
  return `${url}?auto=format&fit=crop&w=${width}&q=70`;
}
