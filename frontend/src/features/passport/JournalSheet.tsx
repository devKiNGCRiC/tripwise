/**
 * JournalSheet.tsx — a finished trip's journal page, opened from its stamp: rate it in
 * diyas, write a memory, add up to 6 photos (shrunk on the device first), and optionally
 * use the photos' colours to theme the whole of TripWise.
 */
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Palette as PaletteIcon, Trash2, X } from 'lucide-react';
import { Link } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useUpdateProfile } from '@/features/account/hooks';
import { ApiError } from '@/lib/api/errors';
import type { Stamp } from '@/lib/api/types';
import { resizeImage } from '@/lib/images';
import { readPalette } from '@/world/readPalette';
import { useWorld } from '@/world/WorldProvider';
import { DiyaRating } from './DiyaRating';
import { useJournal } from './hooks';

/** Photos per trip. */
const MAX_PHOTOS = 6;

/** The journal dialog for one stamp. */
export function JournalSheet({ stamp, onClose }: { stamp: Stamp; onClose: () => void }) {
  const { query, save, addPhoto, removePhoto } = useJournal(stamp.id);
  const updateProfile = useUpdateProfile();
  const { setTint } = useWorld();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [memory, setMemory] = useState('');
  const [loaded, setLoaded] = useState(false);
  const journal = query.data;
  const titleId = `journal-${stamp.id}`;

  // Fill the form once the saved journal arrives.
  useEffect(() => {
    if (journal && !loaded) {
      setRating(journal.rating);
      setMemory(journal.memory);
      setLoaded(true);
    }
  }, [journal, loaded]);

  // Escape closes; focus starts on the close button.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Save the rating and memory. */
  async function saveMemory() {
    try {
      await save.mutateAsync({ rating, memory });
      toast.show({ title: 'Memory saved', tone: 'success' });
      onClose();
    } catch (error) {
      toast.show({ title: error instanceof ApiError ? error.message : 'Your memory couldn’t be saved', tone: 'error' });
    }
  }

  /** Shrink and upload the chosen photos (up to the 6-photo limit). */
  async function addPhotos(files: FileList | null) {
    const room = MAX_PHOTOS - (journal?.photos.length ?? 0);
    for (const file of Array.from(files ?? []).slice(0, room)) {
      try {
        const small = await resizeImage(file, { maxSide: 1600, quality: 0.85 });
        await addPhoto.mutateAsync({ ...small, alt: `A photo from ${stamp.destination}` });
      } catch (error) {
        toast.show({ title: error instanceof ApiError ? error.message : 'That photo couldn’t be added', tone: 'error' });
      }
    }
  }

  /** Tint the whole app with these photos' colours (and remember it on the account). */
  async function themeFromPhotos() {
    const first = journal?.photos[0];
    const palette = first ? await readPalette(first.url) : null;
    if (!palette) return toast.show({ title: 'Those photos couldn’t be read for colours', tone: 'error' });
    setTint(palette);
    updateProfile.mutate({ theme: palette });
    toast.show({ title: `TripWise now wears ${stamp.destination}’s colours`, tone: 'success' });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-card p-6 sm:rounded-card sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">Journal</p>
            <h2 id={titleId} className="font-display text-3xl">
              {stamp.destination} journal
            </h2>
          </div>
          <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-ink/6">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-6">
          <DiyaRating value={rating} onChange={setRating} label="Your rating" />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`memory-${stamp.id}`} className="text-sm font-semibold text-soft">
              Your memory
            </label>
            <textarea
              id={`memory-${stamp.id}`}
              rows={4}
              maxLength={1000}
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder={`What will you remember about ${stamp.destination}?`}
              className="rounded-2xl border border-line bg-glass px-4 py-3 outline-none focus:border-accent"
            />
            <span className="self-end text-xs text-soft">{memory.length}/1000</span>
          </div>

          {/* Photos */}
          <div>
            <p className="mb-2 text-sm font-semibold text-soft">
              Photos ({journal?.photos.length ?? 0}/{MAX_PHOTOS})
            </p>
            <ul className="grid grid-cols-3 gap-2">
              {journal?.photos.map((photo, i) => (
                <li key={photo.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl">
                  <img src={photo.url} alt={photo.alt || `Photo ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => removePhoto.mutate(photo.id)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-black/55 p-1.5 text-white opacity-90 hover:opacity-100"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
              {(journal?.photos.length ?? 0) < MAX_PHOTOS && (
                <li>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="grid aspect-[4/3] w-full place-items-center rounded-xl border-2 border-dashed border-line text-soft hover:border-accent hover:text-ink"
                  >
                    <span className="flex flex-col items-center gap-1 text-sm font-semibold">
                      <ImagePlus aria-hidden className="size-6" />
                      {addPhoto.isPending ? 'Adding…' : 'Add photos'}
                    </span>
                  </button>
                </li>
              )}
            </ul>
            <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" aria-label="Choose trip photos" onChange={(e) => void addPhotos(e.target.files)} />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button onClick={saveMemory} loading={save.isPending}>
              Save memory
            </Button>
            {!!journal?.photos.length && (
              <Button variant="secondary" icon={<PaletteIcon aria-hidden className="size-4" />} onClick={themeFromPhotos}>
                Use these photos to theme my TripWise
              </Button>
            )}
            <Link to={`/trips/${stamp.id}`} className={buttonClasses({ variant: 'ghost' })}>
              Open itinerary
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
