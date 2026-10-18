/**
 * YourColours.tsx — "Your trip. Your palette.": choose (or drop) a photo from a trip you
 * loved; its colours are read right here on the device (nothing is uploaded) and tint the
 * whole living world and the interface. Until then the frame shows the current region's
 * photo, and "Try it with this photo" demonstrates the effect in one click. Or "Use my
 * location" to show the region nearest to you. "Reset colours" goes back to the region's palette.
 */
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useReveal } from '@/components/signature/useReveal';
import { Button } from '@/components/ui/Button';
import { useUpdateProfile } from '@/features/account/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Palette } from '@/world/palette';
import { nearestRegion } from '@/world/geo';
import { readPalette } from '@/world/readPalette';
import { regionByKey } from '@/world/regions';
import { useWorld } from '@/world/WorldProvider';

/** A photo in the frame: its address, and whether it's a temporary in-memory copy to release later. */
interface Shown {
  src: string;
  temporary: boolean;
}

/** The "Your colours" personalisation section. */
export function YourColours() {
  const reveal = useReveal<HTMLElement>();
  const { region, tint, setTint: tintWorld, setRegion } = useWorld();
  const { status } = useAuth();
  const updateProfile = useUpdateProfile();
  /** Tint the world, and remember it on the account while signed in (so it follows you). */
  const setTint = (palette: Palette | null) => {
    tintWorld(palette);
    if (status === 'authenticated') updateProfile.mutate({ theme: palette });
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Shown | null>(null);
  const [message, setMessage] = useState('');

  // Release the previous photo's memory whenever it's replaced or cleared, and on leaving the page.
  useEffect(() => {
    if (!preview?.temporary) return;
    return () => URL.revokeObjectURL(preview.src);
  }, [preview]);

  /** Theme the world from a chosen photo. */
  async function applyPhoto(file: File | undefined) {
    if (!file?.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const palette = await readPalette(url);
    if (!palette) {
      URL.revokeObjectURL(url);
      return setMessage('That photo couldn’t be read — try another.');
    }
    setPreview({ src: url, temporary: true });
    setTint(palette);
    setMessage('Your photo’s colours now tint the whole world.');
  }
  /** One-click demo: tint the world from the current region's own photo. */
  async function tryRegionPhoto() {
    const palette = await readPalette(region.photo.src);
    if (!palette) return setMessage('That photo couldn’t be read — try another.');
    setPreview({ src: region.photo.src, temporary: false });
    setTint(palette);
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
            {!preview && (
              <Button variant="secondary" onClick={() => void tryRegionPhoto()}>
                Try it with this photo
              </Button>
            )}
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
          className="group relative grid aspect-4/3 cursor-pointer place-items-end overflow-hidden rounded-3xl text-center"
        >
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => {
              void applyPhoto(event.target.files?.[0]);
              // Clear it so choosing the same photo again still works.
              event.target.value = '';
            }}
          />
          {preview ? (
            <img src={preview.src} alt="Your trip photo" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              {/* Until a photo is chosen: the region's own photo, waiting to be swapped for yours */}
              <img src={region.photo.src} alt={region.photo.place} className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="relative m-4 rounded-2xl border border-dashed border-white/70 bg-black/35 px-5 py-3 text-white backdrop-blur-md">
                Drop your own trip photo here
                <br />
                <small className="opacity-85">or click to choose one</small>
              </span>
            </>
          )}
        </label>
      </div>
    </section>
  );
}
