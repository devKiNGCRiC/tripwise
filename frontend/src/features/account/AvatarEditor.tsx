/**
 * AvatarEditor.tsx — choose a profile photo, frame it, save it.
 *
 * After picking a photo the traveller sees it in a square frame: drag to move it, slide to
 * zoom. "Use this photo" cuts the square on the device (256×256, about 20 KB) and uploads
 * only that. "Remove photo" goes back to initials.
 */
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/errors';
import type { Profile } from '@/lib/api/types';
import { cropSquare, loadImage } from '@/lib/images';
import { useRemoveAvatar, useUploadAvatar } from './hooks';

/** Size of the saved square, in pixels. */
const AVATAR_SIZE = 256;

/** The profile-photo picker and framer. */
export function AvatarEditor({ profile }: { profile: Profile }) {
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  // The photo being framed, and how it's framed.
  const [picked, setPicked] = useState<{ url: string; img: HTMLImageElement } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Release the picked photo's memory when it's replaced or the editor closes.
  useEffect(() => () => (picked ? URL.revokeObjectURL(picked.url) : undefined), [picked]);

  /** A photo was chosen: load it for framing. */
  async function choose(file: File | undefined) {
    if (!file?.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    try {
      setPicked({ url, img: await loadImage(url) });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch {
      URL.revokeObjectURL(url);
      toast.show({ title: 'That photo couldn’t be read — try another', tone: 'error' });
    }
  }

  /** Dragging moves the photo inside the frame (offsets stay within −1…1). */
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const size = event.currentTarget.clientWidth || 1;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setOffset({ x: clamp(drag.current.ox - ((event.clientX - drag.current.x) / size) * 2), y: clamp(drag.current.oy - ((event.clientY - drag.current.y) / size) * 2) });
  }

  /** Cut the square and upload it. */
  async function save() {
    if (!picked) return;
    try {
      const blob = await cropSquare(picked.img, { size: AVATAR_SIZE, zoom, offsetX: offset.x, offsetY: offset.y, quality: 0.85 });
      await upload.mutateAsync(blob);
      setPicked(null);
      toast.show({ title: 'Photo updated', tone: 'success' });
    } catch (error) {
      toast.show({ title: error instanceof ApiError ? error.message : 'That photo couldn’t be saved — try another', tone: 'error' });
    }
  }

  // Where the photo sits in the frame preview (matches cropSquare's maths).
  const shiftX = -offset.x * (zoom - 1 + (picked ? Math.max(0, picked.img.naturalWidth / picked.img.naturalHeight - 1) : 0)) * 50;
  const shiftY = -offset.y * (zoom - 1 + (picked ? Math.max(0, picked.img.naturalHeight / picked.img.naturalWidth - 1) : 0)) * 50;

  return (
    <div className="flex flex-wrap items-center gap-5">
      {picked ? (
        <div className="flex flex-wrap items-center gap-5">
          <div
            role="img"
            aria-label="Photo preview — drag to move it"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            className="relative size-32 cursor-grab touch-none overflow-hidden rounded-full ring-4 ring-white/80 active:cursor-grabbing"
          >
            <img src={picked.url} alt="" draggable={false} className="size-full object-cover" style={{ transform: `translate(${shiftX}%, ${shiftY}%) scale(${zoom})` }} />
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm font-semibold text-soft">
              Zoom
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="accent-accent" />
            </label>
            <div className="flex gap-2">
              <Button onClick={save} loading={upload.isPending}>
                Use this photo
              </Button>
              <Button variant="ghost" onClick={() => setPicked(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <Avatar name={profile.name} url={profile.avatarUrl} className="size-24 text-4xl ring-4 ring-white/80" />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Camera aria-hidden className="size-4" />} onClick={() => fileRef.current?.click()}>
              {profile.avatarUrl ? 'Change photo' : 'Add a photo'}
            </Button>
            {profile.avatarUrl && (
              <Button variant="ghost" icon={<Trash2 aria-hidden className="size-4" />} loading={remove.isPending} onClick={() => remove.mutate()}>
                Remove photo
              </Button>
            )}
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Choose a profile photo" onChange={(e) => void choose(e.target.files?.[0])} />
    </div>
  );
}
