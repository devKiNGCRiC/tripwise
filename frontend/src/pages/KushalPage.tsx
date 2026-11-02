/**
 * KushalPage.tsx — route /kushal: Kushal, the family check-in ("सब कुशल मंगल?"), for Toli and
 * solo trips. Check in now (with an optional note), switch on automatic check-ins (only while
 * TripWise is open), and give family members their own private link — copied, or sent on
 * WhatsApp with the message already written. They see only your latest check-in.
 */
import { useState, type FormEvent } from 'react';
import { Copy, HeartHandshake, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { checkInFromHere, useKushal } from '@/features/kushal/hooks';
import { useWords } from '@/features/words/WordsProvider';
import { kushalApi } from '@/lib/api/endpoints';
import type { KushalContact } from '@/lib/api/types';

/** Field styles. */
const FIELD = 'h-11 w-full rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5';

/** "10 min ago" style time. */
function ago(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return minutes < 48 * 60 ? `${Math.round(minutes / 60)} h ago` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** WhatsApp, with the message and link already written. */
const whatsappFor = (contact: KushalContact) => `https://wa.me/?text=${encodeURIComponent(`${contact.name}, I'm on a trip — this link always shows my latest check-in (Kushal on TripWise): ${contact.link}`)}`;

/** Route "/kushal". */
export default function KushalPage() {
  const { w, english } = useWords();
  const kushal = useKushal();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  /** Run an action, then refresh my Kushal data. */
  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError('');
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['kushal'] });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      return false;
    } finally {
      setBusy('');
    }
  }

  /** Add a family contact. */
  async function addContact(event: FormEvent) {
    event.preventDefault();
    if (await run('add', () => kushalApi.addContact(name.trim()))) setName('');
  }

  const data = kushal.data;
  return (
    <div className="page-wrap grid gap-6 pt-28 pb-20">
      <title>{`${w.kushal} · TripWise`}</title>
      <PageHeader eyebrow={english ? 'Let family know you’re well' : 'कुशल · Kushal · family check-in'} title={w.kushal} lede="Family at home sees where you last checked in — nothing else. No app or account needed on their side." />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section aria-label="Check in" className="glass-strong grid gap-3 rounded-card p-5">
          <h2 className="inline-flex items-center gap-2 text-xl">
            <HeartHandshake aria-hidden className="size-5" /> All well?
          </h2>
          {data?.latest ? (
            <p className="rounded-2xl bg-accent/10 px-3 py-2 text-sm font-semibold">
              Last check-in: {data.latest.place} · {ago(data.latest.at)}
              {data.latest.note && ` · “${data.latest.note}”`}
            </p>
          ) : (
            <p className="text-sm text-soft">No check-in yet.</p>
          )}
          <label className="grid gap-1">
            <span className="text-sm font-semibold">Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Reached the homestay, all well" className={FIELD} />
          </label>
          <Button
            className="justify-self-start"
            loading={busy === 'checkin'}
            onClick={() =>
              void run('checkin', () => checkInFromHere(note)).then((ok) => {
                if (ok) {
                  setNote('');
                  toast.show({ title: 'Checked in — family can see it now', tone: 'success' });
                }
              })
            }
          >
            Check in now
          </Button>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={!!data?.auto} disabled={!data} onChange={(e) => void run('auto', () => kushalApi.setAuto(e.target.checked))} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
            <span>
              Check in by itself every 30 minutes <b>while TripWise is open</b>. Never in the background, never by SMS — when you have signal and the app is open.
            </span>
          </label>
        </section>

        <section aria-label="Family" className="glass-strong grid gap-3 rounded-card p-5">
          <h2 className="text-xl">Family</h2>
          <p className="text-sm text-soft">Each person gets their own private link. Remove someone and their link stops working. Up to 5.</p>
          <ul aria-label="Family contacts" className="grid gap-2">
            {data?.contacts.map((c) => (
              <li key={c.id} aria-label={c.name} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                <span className="font-semibold">{c.name}</span>
                <span className="ml-auto flex flex-wrap gap-1.5">
                  <a href={whatsappFor(c)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-full bg-[#25d366] px-3 text-sm font-semibold text-[#06331a]">
                    Send on WhatsApp
                  </a>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Copy aria-hidden className="size-4" />}
                    onClick={() =>
                      void navigator.clipboard?.writeText(c.link).then(
                        () => toast.show({ title: 'Link copied', tone: 'success' }),
                        () => undefined,
                      )
                    }
                  >
                    Copy link
                  </Button>
                  <button type="button" aria-label={`Remove ${c.name}`} disabled={busy === c.id} onClick={() => void run(c.id, () => kushalApi.revoke(c.id))} className="grid size-9 place-items-center rounded-full hover:bg-ink/6">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => void addContact(e)} className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-48 flex-1 gap-1">
              <span className="text-sm font-semibold">Name (e.g. Maa)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={FIELD} />
            </label>
            <Button type="submit" variant="secondary" loading={busy === 'add'} disabled={!name.trim()}>
              Add
            </Button>
          </form>
        </section>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
