/**
 * YourColours.tsx — "Your trip. Your palette.": choose (or drop) a photo from a trip you
 * loved; its colours are read right here on the device (nothing is uploaded) and tint the
 * whole living world and the interface. Or "Use my location" to show the region nearest
 * to you. "Reset colours" goes back to the region's own palette.
 */
import { useRef, useState, type DragEvent } from 'react';
import { useReveal } from '@/components/signature/useReveal';
import { Button } from '@/components/ui/Button';
import { nearestRegion } from '@/world/geo';
import { paletteFromPixels } from '@/world/palette';
import { regionByKey } from '@/world/regions';
import { useWorld } from '@/world/WorldProvider';

/** Size the photo is shrunk to before reading its colours (small = fast). */
const SAMPLE = 48;

/** Read a photo file's palette on the device. Resolves null if it can't be read. */
function readPalette(file: File) {
  return new Promise<{ url: string; palette: ReturnType<typeof paletteFromPixels> } | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SAMPLE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
      resolve({ url, palette: paletteFromPixels(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data) });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function YourColours() {
  const reveal = useReveal<HTMLElement>();
  const { tint, setTint, setRegion } = useWorld();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  /** Theme the world from a chosen photo. */
  async function applyPhoto(file: File | undefined) {
    if (!file?.type.startsWith('image/')) return;
    const result = await readPalette(file);
    if (!result) return setMessage('That photo couldn’t be read — try another.');
    setPreview(result.url);
    setTint(result.palette);
    setMessage('Your photo’s colours now tint the whole world.');
  }
  /** Jump to the region nearest the traveller (asks the browser for permission). */
  function findMyRegion() {
    if (!navigator.geolocation) return setMessage('Location isn’t available in this browser.');
    setMessage('Finding the India around you…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const key = nearestRegion(coords.latitude, coords.longitude);
        setRegion(key, { fromUser: true });
        setMessage(`Closest to you: ${regionByKey(key)?.name}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      () => setMessage('No problem — pick a region above instead.'),
    );
  }
  /** Drop a photo onto the frame. */
  function onDrop(event: DragEvent) {
    event.preventDefault();
    void applyPhoto(event.dataTransfer.files[0]);
  }

  return (
    <section ref={reveal} aria-labelledby="yours-title" className="page-wrap pb-[clamp(40px,8vh,90px)]">
      <div className="reveal-up glass-strong grid items-center gap-9 rounded-[36px] p-[clamp(22px,3.4vw,48px)] lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="text-[11px] font-bold tracking-[0.18em] text-soft uppercase">Your colours</span>
          <h2 id="yours-title" className="mt-3 text-[clamp(32px,3.6vw,54px)]">
            Your trip. <em>Your palette.</em>
          </h2>
          <p className="mt-3 max-w-[44ch] text-soft">
            Choose a photo from a trip you loved — TripWise reads its colours on your device (nothing is uploaded) and tints the whole world to
            match. Or let it use your location to show the India around you.
          </p>
          <div aria-label="Photo colours" className="my-5 flex gap-2">
            {(tint?.swatches ?? [null, null, null, null]).map((colour, i) => (
              <span key={i} aria-hidden className="size-11 rounded-2xl border border-line bg-ink/6" style={colour ? { background: colour } : undefined} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="glow" onClick={() => fileRef.current?.click()}>
              Choose a photo
            </Button>
            <Button variant="secondary" onClick={findMyRegion}>
              Use my location
            </Button>
            {tint && (
              <Button
                variant="ghost"
                onClick={() => {
                  setTint(null);
                  setPreview(null);
                  setMessage('');
                }}
              >
                Reset colours
              </Button>
            )}
          </div>
          <p role="status" className="mt-3 min-h-6 text-sm text-soft">
            {message}
          </p>
        </div>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          className="relative grid aspect-4/3 cursor-pointer place-items-center overflow-hidden rounded-3xl border-[1.5px] border-dashed border-line text-center text-soft"
        >
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => void applyPhoto(event.target.files?.[0])} />
          {preview ? (
            <img src={preview} alt="Your trip photo" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span>
              Drop a trip photo here
              <br />
              <small>or click to choose</small>
            </span>
          )}
        </label>
      </div>
    </section>
  );
}
