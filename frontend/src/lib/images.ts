/**
 * images.ts — shrinking photos on the traveller's device before upload, so uploads are
 * small (fast on mobile data, and they fit the free storage).
 *
 * The photo is drawn onto a canvas at the new size and saved as WebP (or JPEG where the
 * browser can't make WebP). Nothing leaves the device until the upload itself.
 */

/** Load an image file so it can be drawn. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That photo could not be read'));
    img.src = src;
  });
}

/** Turn a canvas into an image file (WebP if possible, else JPEG). */
function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (webp) => {
        if (webp && webp.type === 'image/webp') return resolve(webp);
        canvas.toBlob((jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('That photo could not be saved'))), 'image/jpeg', quality);
      },
      'image/webp',
      quality,
    );
  });
}

/** Shrink a photo so its longest side is at most `maxSide` pixels. */
export async function resizeImage(file: File, opts: { maxSide: number; quality: number }): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, opts.maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
    return { blob: await canvasToBlob(canvas, opts.quality), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Cut a square out of a photo for a profile picture.
 * `zoom` ≥ 1 enlarges the photo; `offsetX/offsetY` (−1…1) move the square around it.
 */
export async function cropSquare(img: HTMLImageElement, opts: { size: number; zoom: number; offsetX: number; offsetY: number; quality: number }): Promise<Blob> {
  const side = Math.min(img.naturalWidth, img.naturalHeight) / opts.zoom;
  // How far the square may move each way, then where it sits.
  const spareX = (img.naturalWidth - side) / 2;
  const spareY = (img.naturalHeight - side) / 2;
  const sx = spareX + opts.offsetX * spareX;
  const sy = spareY + opts.offsetY * spareY;
  const canvas = document.createElement('canvas');
  canvas.width = opts.size;
  canvas.height = opts.size;
  canvas.getContext('2d')!.drawImage(img, sx, sy, side, side, 0, 0, opts.size, opts.size);
  return canvasToBlob(canvas, opts.quality);
}
