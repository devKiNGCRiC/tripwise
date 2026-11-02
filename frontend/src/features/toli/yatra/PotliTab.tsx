/**
 * PotliTab.tsx — the Toli's Potli (packing list): things the group needs ("first-aid kit",
 * "speaker") that someone claims ("I'll bring it") and ticks packed, next to my own list, which
 * nobody else ever sees.
 */
import { useState, type FormEvent } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { PotliItem, Toli } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from '../hooks';

/** Field styles. */
const FIELD = 'h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';

/** One item, with what the viewer may do. */
function Item({ toli, item, onError }: { toli: Toli; item: PotliItem; onError: (message: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mineToBring = item.mine || item.claimedBy?.id === user?.id;

  /** Run an action, then refresh. */
  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      void queryClient.invalidateQueries({ queryKey: ['potli', toli.id] });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  return (
    <li aria-label={item.text} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
      {mineToBring && <input type="checkbox" aria-label={`Packed ${item.text}`} checked={item.packed} onChange={(e) => void run(() => toliApi.setPacked(toli.id, item.id, e.target.checked))} className="size-4 accent-[var(--color-accent)]" />}
      <span className={item.packed ? 'text-soft line-through' : 'font-semibold'}>{item.text}</span>
      {!item.mine && (
        <span className="text-sm text-soft">
          {item.claimedBy ? (item.claimedBy.id === user?.id ? 'You bring it' : `${item.claimedBy.name} brings it`) : 'Nobody yet'}
        </span>
      )}
      <span className="ml-auto flex gap-1.5">
        {!item.mine && !item.claimedBy && (
          <Button size="sm" variant="secondary" onClick={() => void run(() => toliApi.claim(toli.id, item.id))}>
            I’ll bring it
          </Button>
        )}
        {!item.mine && item.claimedBy?.id === user?.id && (
          <Button size="sm" variant="ghost" onClick={() => void run(() => toliApi.unclaim(toli.id, item.id))}>
            Let it go
          </Button>
        )}
        {item.canDelete && (
          <button type="button" aria-label={`Remove ${item.text}`} onClick={() => void run(() => toliApi.deletePotli(toli.id, item.id))} className="grid size-9 place-items-center rounded-full hover:bg-ink/6">
            <Trash2 aria-hidden className="size-4" />
          </button>
        )}
      </span>
    </li>
  );
}

/** The Potli tab. */
export function PotliTab({ toli }: { toli: Toli }) {
  const { w, english } = useWords();
  const queryClient = useQueryClient();
  const potli = useQuery({ queryKey: ['potli', toli.id], queryFn: () => toliApi.potli(toli.id), refetchInterval: TOLI_REFRESH_MS });
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  /** Add to the group's list or to mine. */
  async function add(mine: boolean, event?: FormEvent) {
    event?.preventDefault();
    if (!text.trim()) return;
    setError('');
    try {
      await toliApi.addPotli(toli.id, text.trim(), mine);
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['potli', toli.id] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t add that.');
    }
  }

  return (
    <div className="grid gap-5">
      <section className="glass-strong grid gap-3 rounded-card p-5">
        <h2 className="inline-flex items-center gap-2 text-2xl">
          <Package aria-hidden className="size-6" />
          {w.potli}{' '}
          {!english && (
            <span lang="hi" className="font-hindi text-lg text-[#b8862f]">
              पोटली
            </span>
          )}
        </h2>
        <p className="text-sm text-soft">{english ? 'What the group needs, and who brings it — plus your own list.' : 'Packing list: what the group needs, and who brings it — plus your own list.'}</p>
        <form onSubmit={(e) => void add(false, e)} className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-56 flex-1 gap-1">
            <span className="text-sm font-semibold">Something to pack</span>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={80} placeholder="Power bank" className={FIELD} />
          </label>
          <Button type="submit" variant="secondary" disabled={!text.trim()}>
            Add for the group
          </Button>
          <Button type="button" variant="ghost" disabled={!text.trim()} onClick={() => void add(true)}>
            Add to my list
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="glass-strong grid gap-3 rounded-card p-5">
          <h3 className="text-xl">For the {w.toli}</h3>
          {potli.data?.group.length === 0 && <p className="text-sm text-soft">Nothing yet — first-aid kit, speaker, power bank?</p>}
          <ul aria-label="Group items" className="grid gap-2">
            {potli.data?.group.map((i) => (
              <Item key={i.id} toli={toli} item={i} onError={setError} />
            ))}
          </ul>
        </section>
        <section className="glass-strong grid gap-3 rounded-card p-5">
          <h3 className="text-xl">My own list</h3>
          <p className="text-xs text-soft">Only you see this.</p>
          <ul aria-label="My own list" className="grid gap-2">
            {potli.data?.mine.map((i) => (
              <Item key={i.id} toli={toli} item={i} onError={setError} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
