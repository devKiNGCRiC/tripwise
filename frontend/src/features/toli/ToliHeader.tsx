/**
 * ToliHeader.tsx — the top of a Toli page: its name, kind of trip, announcement mode, the
 * Sahyatris' faces, and (for leaders) the invite: "Invite on WhatsApp" opens WhatsApp with
 * the message and link already written; "Copy link" copies it.
 */
import { Copy, HeartHandshake, Megaphone } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useWords } from '@/features/words/WordsProvider';
import type { Toli } from '@/lib/api/types';
import { roleLabel, TYPE_LABEL } from './labels';

/** Faces shown before "+N". */
const FACES = 5;

/** The WhatsApp share link for an invite. */
export function whatsappInvite(toli: Pick<Toli, 'name'>, inviteUrl: string) {
  return `https://wa.me/?text=${encodeURIComponent(`Join my Toli “${toli.name}” on TripWise — let’s plan it together: ${inviteUrl}`)}`;
}

/** The Toli page header. */
export function ToliHeader({ toli }: { toli: Toli }) {
  const { w, english } = useWords();
  const toast = useToast();
  const sutradhar = toli.members.find((m) => m.role === 'sutradhar');

  /** Copy the invite link. */
  async function copy() {
    try {
      await navigator.clipboard.writeText(toli.inviteUrl!);
      toast.show({ title: 'Invite link copied', tone: 'success' });
    } catch {
      toast.show({ title: 'Couldn’t copy — select the link instead.', tone: 'error' });
    }
  }

  return (
    <header className="glass-strong grid gap-4 rounded-[32px] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">
            {!english && (
              <>
                <span lang="hi" className="font-hindi normal-case tracking-normal text-[#b8862f]">
                  टोली
                </span>{' '}
                · Toli ·{' '}
              </>
            )}
            plan trips together
          </p>
          <h1 className="mt-2 text-[clamp(36px,5vw,60px)]">{toli.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-line px-3 py-1 font-semibold">{TYPE_LABEL[toli.type]}</span>
            {toli.announcementMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-3 py-1 font-semibold">
                <Megaphone aria-hidden className="size-3.5" /> Announcement mode — leaders post, everyone reads
              </span>
            )}
            <span className="text-soft">You’re the {roleLabel(w, toli.me.role)}</span>
            {/* Tell family you're well (Kushal), right from the trip. */}
            <Link to="/kushal" className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-3 py-1 font-semibold">
              <HeartHandshake aria-hidden className="size-3.5" /> {w.kushal}
            </Link>
          </div>
        </div>
        {toli.inviteUrl && (
          <div className="flex flex-wrap gap-2">
            <a href={whatsappInvite(toli, toli.inviteUrl)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full bg-[#25d366] px-5 font-semibold text-[#06331a]">
              Invite on WhatsApp
            </a>
            <Button variant="secondary" icon={<Copy aria-hidden className="size-4" />} onClick={() => void copy()}>
              Copy link
            </Button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex">
          {toli.members.slice(0, FACES).map((m, i) => (
            <Avatar key={m.id} name={m.name} url={m.avatarUrl} className={i ? '-ml-2 size-9 border-2 border-white text-sm' : 'size-9 border-2 border-white text-sm'} />
          ))}
        </div>
        <p className="text-sm text-soft">
          {toli.memberCount} {toli.memberCount === 1 ? w.sahyatri : w.sahyatris}
          {sutradhar && ` · led by ${sutradhar.name}`}
          {toli.memberCount > FACES && ` · +${toli.memberCount - FACES} more`}
        </p>
      </div>
    </header>
  );
}
