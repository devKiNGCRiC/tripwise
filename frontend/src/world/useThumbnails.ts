/**
 * useThumbnails.ts — a small painted picture of each of the seven worlds (by day),
 * used in the region bar and the "Seven worlds" cards. Drawn once per visit, a moment
 * after the page appears, then shared by every component that asks.
 * Returns empty strings while drawing, or when the browser can't draw on a canvas.
 */
import { useEffect, useState } from 'react';
import { REGIONS } from './regions';
import { Scene } from './scene';

/** Thumbnail size in px (portrait, fits the arch-shaped frames). */
const WIDTH = 360;
const HEIGHT = 420;

/** Drawn once and shared (null = not drawn yet). */
let cache: string[] | null = null;

/** Paint every region into a small canvas and keep the images. */
function drawAll(): string[] {
  return REGIONS.map((region) => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    new Scene(region).draw(ctx, WIDTH, HEIGHT, 3, 0, 0, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  });
}

/** Thumbnail data URLs in REGIONS order. */
export function useThumbnails(): string[] {
  const [thumbs, setThumbs] = useState<string[]>(() => cache ?? REGIONS.map(() => ''));

  useEffect(() => {
    if (cache) return;
    // Draw after the first paint so the page appears immediately.
    const timer = window.setTimeout(() => {
      cache = drawAll();
      setThumbs(cache);
    }, 60);
    return () => window.clearTimeout(timer);
  }, []);

  return thumbs;
}
