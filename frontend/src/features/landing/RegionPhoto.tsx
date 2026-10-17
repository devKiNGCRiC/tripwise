/**
 * RegionPhoto.tsx — a real photograph of the region, set like a postcard into the top of
 * the dossier. Its lower edge melts into the glass (a soft mask) so it blends with the
 * drawn world instead of sitting on top of it, and when the region changes the new
 * place fades in over the old one. Carries its free-licence credit as a small link.
 */
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Region } from '@/world/regions';

/** Fade the photo out towards the bottom so it dissolves into the glass panel. */
const MELT = '[mask-image:linear-gradient(to_bottom,black_55%,transparent)]';

/** The region's photo with a cross-fade from the previous region's photo. */
export function RegionPhoto({ region, className }: { region: Region; className?: string }) {
  // The photo being faded out (null once the new one has fully arrived).
  const [shown, setShown] = useState(region);
  const [previous, setPrevious] = useState<Region | null>(null);

  // A new region: keep the old photo underneath while the new one fades in.
  useEffect(() => {
    if (region.key === shown.key) return;
    setPrevious(shown);
    setShown(region);
    const timer = window.setTimeout(() => setPrevious(null), 900);
    return () => window.clearTimeout(timer);
  }, [region, shown]);

  const { photo } = shown;
  return (
    <figure className={cn('relative overflow-hidden', className)}>
      {previous && <img src={previous.photo.src} alt="" aria-hidden className={cn('absolute inset-0 size-full object-cover', MELT)} />}
      <img
        key={shown.key}
        src={photo.src}
        alt={photo.place}
        decoding="async"
        className={cn('absolute inset-0 size-full animate-[photo-in_0.9s_ease_both] object-cover', MELT)}
      />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-1 text-[11px] sm:px-6">
        <span className="truncate font-semibold text-ink">{photo.place}</span>
        {/* Short visible credit; the full credit is the link's accessible name and tooltip */}
        <a
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Photo: ${photo.author} · ${photo.license}`}
          title={`Photo: ${photo.author} · ${photo.license} (Wikimedia Commons)`}
          className="shrink-0 text-soft underline-offset-2 hover:underline"
        >
          © {photo.license}
        </a>
      </figcaption>
    </figure>
  );
}
