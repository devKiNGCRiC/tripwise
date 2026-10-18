/**
 * readPalette.ts — read a photo's colours (by URL) into a Palette that tints the app.
 * The photo is drawn small onto a canvas on the device; nothing is uploaded. Returns null
 * if the photo can't be read (broken link, or a host that doesn't allow reading pixels).
 */
import { paletteFromPixels, type Palette } from './palette';

/** Pixels sampled per side (small is plenty for colours, and fast). */
const SAMPLE = 48;

/** The palette of the photo at `src`, or null. */
export function readPalette(src: string): Promise<Palette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Ask for permission to read pixels of photos from other sites (Unsplash allows it).
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = SAMPLE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        resolve(paletteFromPixels(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
