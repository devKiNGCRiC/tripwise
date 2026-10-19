/**
 * ColoursMenu.tsx — the palette button in the navbar and its small menu. It's for fun,
 * not for planning, so it lives here instead of taking up the homepage:
 *   Match a photo           read a trip photo's colours on this device (nothing is
 *                           uploaded) and tint the whole living world and interface
 *   Use this world's photo  the same, in one click, with the current region's photo
 *   Use my location         show the region nearest to you
 *   Reset colours           back to the region's own palette
 * Signed in, the tint is saved on your account so it follows you. The menu closes with
 * its button, Escape (focus goes back to the button) or a click outside it.
 */
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, LocateFixed, Palette as PaletteIcon, RotateCcw, Sparkles } from 'lucide-react';
import { useUpdateProfile } from '@/features/account/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/utils/cn';
import { nearestRegion } from '@/world/geo';
import type { Palette } from '@/world/palette';
import { readPalette } from '@/world/readPalette';
import { regionByKey } from '@/world/regions';
import { useWorld } from '@/world/WorldProvider';

/** A photo shown in the menu: its address, and whether it's a temporary in-memory copy to release later. */
interface Shown {
  src: string;
  temporary: boolean;
}

/** One row in the menu. */
const ROW = 'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium hover:bg-ink/6 focus-visible:bg-ink/6';

/** The navbar's palette button and menu. */
export function ColoursMenu({ className }: { className?: string }) {
  const { region, tint, setTint: tintWorld, setRegion } = useWorld();
  const { status } = useAuth();
  const updateProfile = useUpdateProfile();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Shown | null>(null);
  const [message, setMessage] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /** Tint the world, and remember it on the account while signed in (so it follows you). */
  const setTint = (palette: Palette | null) => {
    tintWorld(palette);
    if (status === 'authenticated') updateProfile.mutate({ theme: palette });
  };

  // Release the previous photo's memory whenever it's replaced or cleared, and on leaving.
  useEffect(() => {
    if (!preview?.temporary) return;
    return () => URL.revokeObjectURL(preview.src);
  }, [preview]);

  // While open: Escape closes (back to the button), and so does a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  /** Theme the world from a chosen photo. */
  async function applyPhoto(file: File | undefined) {
    if (!file?.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const palette = await readPalette(url);
    if (!palette) {
      URL.revokeObjectURL(url);
      return setMessage('That photo couldn’t be read — try a JPG or PNG.');
    }
    setPreview({ src: url, temporary: true });
    setTint(palette);
    setMessage('Your photo’s colours now tint the whole world.');
  }
  /** One click: tint the world from the current region's own photo. */
  async function tintFromRegionPhoto() {
    const palette = await readPalette(region.photo.src);
    if (!palette) return setMessage('That photo couldn’t be read — try a JPG or PNG.');
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
      },
      () => setMessage('No problem — pick a world from the homepage instead.'),
    );
  }
  /** Back to the region's own colours. */
  function reset() {
    setTint(null);
    setPreview(null);
    setMessage('');
  }

  return (
    // Phones: the menu hangs from the whole header (full width) instead of the button.
    <div ref={rootRef} className={cn('sm:relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Colours"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((was) => !was)}
        className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-ink transition hover:-rotate-12"
      >
        <PaletteIcon className="size-[18px]" aria-hidden />
      </button>

      {open && (
        // Solid: inside the navbar's own glass the blur doesn't apply, so see-through glass would let the page show through.
        <div
          role="dialog"
          aria-label="Colours"
          className="absolute top-[calc(100%+12px)] z-50 rounded-3xl border border-line bg-white p-3 shadow-xl max-sm:inset-x-3 sm:right-0 sm:w-80 dark:bg-[#0e1424]"
        >
          <div className="flex items-center gap-3 px-3 pt-2 pb-3">
            {preview ? (
              <img src={preview.src} alt="Your trip photo" className="size-12 rounded-2xl object-cover" />
            ) : (
              <img src={region.photo.thumb} alt="" className="size-12 rounded-2xl object-cover" />
            )}
            <div className="min-w-0">
              <p className="font-display text-lg leading-tight">Your colours</p>
              <p className="text-sm text-soft">Tint TripWise from a trip you loved.</p>
            </div>
          </div>
          {/* The palette in use (empty until a photo is read) */}
          <div aria-hidden className="flex gap-1.5 px-3 pb-3">
            {(tint?.swatches ?? [null, null, null, null]).map((colour, i) => (
              <span key={i} className="h-6 flex-1 rounded-lg border border-line bg-ink/6" style={colour ? { background: colour } : undefined} />
            ))}
          </div>

          <div className="grid gap-0.5 border-t border-line pt-2">
            {/* The file input is the row itself, so it's reachable and labelled */}
            <label className={cn(ROW, 'cursor-pointer focus-within:bg-ink/6')}>
              <ImagePlus aria-hidden className="size-[18px] text-soft" />
              Match a photo
              <input
                type="file"
                accept="image/*"
                aria-label="Match a photo"
                className="sr-only"
                onChange={(event) => {
                  void applyPhoto(event.target.files?.[0]);
                  // Clear it so choosing the same photo again still works.
                  event.target.value = '';
                }}
              />
            </label>
            <button type="button" className={ROW} onClick={() => void tintFromRegionPhoto()}>
              <Sparkles aria-hidden className="size-[18px] text-soft" />
              Use this world's photo
            </button>
            <button type="button" className={ROW} onClick={findMyRegion}>
              <LocateFixed aria-hidden className="size-[18px] text-soft" />
              Use my location
            </button>
            {tint && (
              <button type="button" className={ROW} onClick={reset}>
                <RotateCcw aria-hidden className="size-[18px] text-soft" />
                Reset colours
              </button>
            )}
          </div>
          <p role="status" className="px-3 pt-1 pb-1 text-sm text-soft empty:hidden">
            {message}
          </p>
          <p className="px-3 pb-1 text-xs text-soft">Photos are read on your device — nothing is uploaded.</p>
        </div>
      )}
    </div>
  );
}
