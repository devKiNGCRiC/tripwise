/**
 * Composer.tsx — writing in Chaupal: a message (Enter sends, Shift+Enter for a new line), an
 * optional reply ("Replying to …", cancellable), @mention suggestions for the Toli's members
 * as you type "@", and up to 4 photos (shrunk on the phone before uploading, like journal
 * photos). Sending is handed to the chat, which keeps a message safe until there's signal.
 */
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ImagePlus, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { ChaupalMessage, Toli } from '@/lib/api/types';
import { resizeImage } from '@/lib/images';

/** Photos per message. */
const MAX_PHOTOS = 4;

/** The message box. */
export function Composer({
  toli,
  replyTo,
  onCancelReply,
  onSend,
}: {
  toli: Toli;
  replyTo: ChaupalMessage | null;
  onCancelReply: () => void;
  onSend: (message: { text: string; replyTo?: string; photoIds: string[] }) => void;
}) {
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // The word being typed, when it starts with "@": suggest members who match.
  const typing = /@([a-z0-9_]*)$/i.exec(text)?.[1]?.toLowerCase();
  const suggestions = typing === undefined ? [] : toli.members.filter((m) => m.username.toLowerCase().startsWith(typing)).slice(0, 5);

  /** Send what's written (and the photos), then clear. */
  function send(event?: FormEvent) {
    event?.preventDefault();
    if (!text.trim() && !photos.length) return;
    onSend({ text: text.trim(), ...(replyTo ? { replyTo: replyTo.id } : {}), photoIds: photos.map((p) => p.id) });
    setText('');
    setPhotos([]);
  }

  /** Enter sends; Shift+Enter is a new line. */
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  /** Shrink and upload chosen photos. */
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    setError('');
    try {
      for (const file of [...files].slice(0, MAX_PHOTOS - photos.length)) {
        const { blob } = await resizeImage(file, { maxSide: 1600, quality: 0.82 });
        const { photo } = await toliApi.uploadPhoto(toli.id, blob);
        setPhotos((list) => [...list, photo]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t add that photo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={send} className="grid gap-2 rounded-3xl border border-line bg-white/80 p-3 dark:bg-white/5">
      {replyTo && (
        <p className="flex items-center justify-between gap-2 rounded-xl bg-accent/10 px-3 py-1.5 text-sm">
          <span className="truncate">{`Replying to ${replyTo.author.name}: ${replyTo.text.slice(0, 60)}`}</span>
          <button type="button" aria-label="Cancel reply" onClick={onCancelReply}>
            <X aria-hidden className="size-4" />
          </button>
        </p>
      )}
      {photos.length > 0 && (
        <div className="flex gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative">
              <img src={p.url} alt="" className="size-16 rounded-xl object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))} className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-on-ink">
                <X aria-hidden className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div role="group" aria-label="Mention someone" className="flex flex-wrap gap-1.5">
          {suggestions.map((m) => (
            <button key={m.id} type="button" onClick={() => setText(text.replace(/@[a-z0-9_]*$/i, `@${m.username} `))} className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:bg-ink/6">
              @{m.username} · {m.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <button type="button" aria-label="Add photos" disabled={uploading || photos.length >= MAX_PHOTOS} onClick={() => fileRef.current?.click()} className="grid size-11 shrink-0 place-items-center rounded-full border border-line hover:bg-ink/6 disabled:opacity-50">
          <ImagePlus aria-hidden className="size-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => void addPhotos(e.target.files)} />
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} rows={1} maxLength={2000} placeholder="Write to the Toli… (@ to mention)" className="max-h-40 min-h-11 w-full resize-y rounded-2xl border border-line bg-transparent px-4 py-2.5 outline-none focus:border-accent" />
        </label>
        <Button type="submit" aria-label="Send" disabled={uploading || (!text.trim() && !photos.length)} className="size-11 shrink-0 px-0">
          <Send aria-hidden className="size-4" />
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
