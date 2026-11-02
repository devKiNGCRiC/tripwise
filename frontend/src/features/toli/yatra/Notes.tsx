/**
 * Notes.tsx — the Toli's shared notes: for the whole trip ("Homestay owner: Ramesh") or for a day
 * ("Carry permits"). Everyone sees them; whoever wrote a note (or a leader) can edit or remove it.
 */
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli, ToliNote } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from '../hooks';

/** Field styles. */
const FIELD = 'w-full rounded-2xl border border-line bg-white/70 px-4 py-2.5 outline-none focus:border-accent dark:bg-white/5';

/** One note, editable by whoever may. */
function NoteItem({ toli, note }: { toli: Toli; note: ToliNote }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.text);
  const [error, setError] = useState('');

  /** Save or remove, then refresh. */
  async function run(action: () => Promise<unknown>) {
    setError('');
    try {
      await action();
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['notes', toli.id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save that.');
    }
  }

  return (
    <article aria-label={note.text.slice(0, 60)} className="grid gap-1 rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
      <p className="text-xs font-semibold text-soft">
        {note.day ? `Day ${note.day}` : 'Whole trip'} · {note.author.name}
      </p>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => toliApi.editNote(toli.id, note.id, text));
          }}
          className="grid gap-2"
        >
          <label>
            <span className="sr-only">Note</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={2} className={FIELD} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!text.trim()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap">{note.text}</p>
      )}
      {note.canEdit && !editing && (
        <div className="flex gap-3 text-xs font-semibold">
          <button type="button" aria-label="Edit note" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" aria-label="Remove note" onClick={() => void run(() => toliApi.deleteNote(toli.id, note.id))} className="text-danger">
            Remove
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </article>
  );
}

/** The notes card. */
export function Notes({ toli, days }: { toli: Toli; days: number }) {
  const queryClient = useQueryClient();
  const notes = useQuery({ queryKey: ['notes', toli.id], queryFn: () => toliApi.notes(toli.id), select: (d) => d.notes, refetchInterval: TOLI_REFRESH_MS });
  const [text, setText] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');

  /** Add a note. */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await toliApi.addNote(toli.id, text.trim(), day ? Number(day) : null);
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['notes', toli.id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t add that.');
    }
  }

  return (
    <section aria-label="Notes" className="glass-strong grid gap-3 rounded-card p-5">
      <h2 className="text-xl">Notes</h2>
      {notes.data?.length === 0 && <p className="text-sm text-soft">Nothing yet — phone numbers, permits, who has the keys.</p>}
      <div className="grid gap-2">
        {notes.data?.map((n) => (
          <NoteItem key={n.id} toli={toli} note={n} />
        ))}
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold">New note</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} rows={2} placeholder="Homestay owner: Ramesh (ask at the gate)" className={FIELD} />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">For</span>
            <select value={day} onChange={(e) => setDay(e.target.value)} className={`${FIELD} h-11 py-0`}>
              <option value="">Whole trip</option>
              {Array.from({ length: days }, (_, i) => (
                <option key={i} value={i + 1}>
                  Day {i + 1}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm" variant="secondary" disabled={!text.trim()}>
            Add note
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
