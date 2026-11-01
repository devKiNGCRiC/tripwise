/**
 * SahyatrisTab.tsx — everyone in the Toli: name, role, and Call buttons (phone and WhatsApp)
 * for those who chose to share a number. Leaders add friends by @username and remove people;
 * the Sutradhar makes co-leaders (Sah-Sutradhar) or passes the Sutradhar role on. Everyone
 * can share or hide their own number (this Toli only) and leave (the Sutradhar passes the
 * role on first).
 */
import { useState, type FormEvent } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { Toli, ToliMember, ToliRole } from '@/lib/api/types';
import { useToliAction } from './hooks';
import { roleLabel } from './labels';

/** Small round action link/button styles. */
const ROUND = 'grid size-9 place-items-center rounded-full border border-line hover:bg-ink/6';

/** One Sahyatri, with what the viewer may do. */
function MemberRow({ toli, member }: { toli: Toli; member: ToliMember }) {
  const { w } = useWords();
  const { user } = useAuth();
  const setRole = useToliAction(toli.id, (role: ToliRole) => toliApi.updateMember(toli.id, member.id, { role }));
  const remove = useToliAction(toli.id, () => toliApi.removeMember(toli.id, member.id));
  const isMe = member.id === user?.id;
  const mine = toli.me.role;
  // The Sutradhar can't be removed; only the Sutradhar removes co-leaders.
  const canRemove = !isMe && mine !== 'sahyatri' && member.role !== 'sutradhar' && (member.role !== 'sah' || mine === 'sutradhar');
  const digits = member.phone?.replace(/^\+/, '');

  return (
    <li aria-label={`${member.name}, ${roleLabel(w, member.role)}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/50 p-3 dark:bg-white/5">
      <Avatar name={member.name} url={member.avatarUrl} className="size-10 text-base" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {member.name} {isMe && <span className="text-soft">(you)</span>}
        </p>
        <p className="text-sm text-soft">
          @{member.username} · <span>{roleLabel(w, member.role)}</span>
        </p>
      </div>
      {member.phone && !isMe && (
        <div className="flex gap-1.5">
          <a href={`tel:${member.phone}`} aria-label={`Call ${member.name}`} className={ROUND}>
            <Phone aria-hidden className="size-4" />
          </a>
          <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" aria-label={`WhatsApp call ${member.name}`} className={ROUND}>
            <MessageCircle aria-hidden className="size-4" />
          </a>
        </div>
      )}
      {mine === 'sutradhar' && !isMe && (
        <div className="flex flex-wrap gap-1.5">
          {member.role === 'sahyatri' ? (
            <Button size="sm" variant="secondary" loading={setRole.isPending} onClick={() => setRole.mutate('sah')}>
              Make {w.sah}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" loading={setRole.isPending} onClick={() => setRole.mutate('sahyatri')}>
              Make {w.sahyatri}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => window.confirm(`Pass the ${w.sutradhar} role to ${member.name}? You'll become a ${w.sah}.`) && setRole.mutate('sutradhar')}>
            Pass {w.sutradhar} role
          </Button>
        </div>
      )}
      {canRemove && (
        <Button size="sm" variant="ghost" aria-label={`Remove ${member.name}`} loading={remove.isPending} onClick={() => remove.mutate(undefined)}>
          Remove
        </Button>
      )}
      {/* Why a change was refused (e.g. they still owe money in the Lekha). */}
      {(remove.isError || setRole.isError) && (
        <p role="alert" className="w-full text-sm text-danger">
          {(remove.error ?? setRole.error)?.message}
        </p>
      )}
    </li>
  );
}

/** Leaders: add a friend by @username. */
function AddFriend({ toli }: { toli: Toli }) {
  const [username, setUsername] = useState('');
  const add = useToliAction(toli.id, (name: string) => toliApi.addMember(toli.id, name));

  /** Add them, then clear the box. */
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    add.mutate(username.trim().replace(/^@/, ''), { onSuccess: () => setUsername('') });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="grid min-w-56 flex-1 gap-1.5">
        <span className="text-sm font-semibold">Add a friend by @username</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="h-11 rounded-2xl border border-line bg-white/60 px-4 outline-none focus:border-accent dark:bg-white/5" />
      </label>
      <Button type="submit" variant="secondary" loading={add.isPending} disabled={!username.trim()}>
        Add
      </Button>
      {add.isError && (
        <p role="alert" className="w-full text-sm text-danger">
          {add.error.message}
        </p>
      )}
    </form>
  );
}

/** Share or hide my number with this Toli. */
function MyNumber({ toli }: { toli: Toli }) {
  const { w } = useWords();
  const [phone, setPhone] = useState('');
  const save = useToliAction(toli.id, (value: string | null) => toliApi.setPhone(toli.id, value));

  /** Share the typed number. */
  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate(phone, { onSuccess: () => setPhone('') });
  }

  return toli.me.phone ? (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span>
        Your number <b>{toli.me.phone}</b> is shared with this {w.toli} (for Call buttons).
      </span>
      <Button size="sm" variant="ghost" loading={save.isPending} onClick={() => save.mutate(null)}>
        Stop sharing
      </Button>
    </div>
  ) : (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="grid min-w-56 flex-1 gap-1.5">
        <span className="text-sm font-semibold">Your phone number (shared with this {w.toli} only)</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" className="h-11 rounded-2xl border border-line bg-white/60 px-4 outline-none focus:border-accent dark:bg-white/5" />
      </label>
      <Button type="submit" variant="secondary" loading={save.isPending} disabled={!phone.trim()}>
        Share number
      </Button>
      {save.isError && (
        <p role="alert" className="w-full text-sm text-danger">
          {save.error.message}
        </p>
      )}
    </form>
  );
}

/** The Sahyatris tab. */
export function SahyatrisTab({ toli }: { toli: Toli }) {
  const { w, english } = useWords();
  const { user } = useAuth();
  const navigate = useNavigate();
  const leave = useToliAction(toli.id, () => toliApi.removeMember(toli.id, user!.id));

  return (
    <section aria-label="Sahyatris" className="glass-strong grid gap-5 rounded-card p-6">
      <div>
        <h2 className="text-2xl">
          {w.sahyatris}{' '}
          {!english && (
            <span lang="hi" className="font-hindi text-lg text-[#b8862f]">
              सहयात्री
            </span>
          )}
        </h2>
        <p className="text-sm text-soft">Fellow travellers. Those who share a number get Call buttons.</p>
      </div>
      <ul aria-label="Sahyatris" className="grid gap-2">
        {toli.members.map((m) => (
          <MemberRow key={m.id} toli={toli} member={m} />
        ))}
      </ul>
      {toli.me.role !== 'sahyatri' && <AddFriend toli={toli} />}
      <MyNumber toli={toli} />
      {toli.me.role === 'sutradhar' ? (
        <p className="text-sm text-soft">To leave, pass the {w.sutradhar} role to someone first.</p>
      ) : (
        <Button variant="ghost" className="justify-self-start text-danger" loading={leave.isPending} onClick={() => leave.mutate(undefined, { onSuccess: () => navigate('/tolis') })}>
          Leave this {w.toli}
        </Button>
      )}
      {leave.isError && (
        <p role="alert" className="text-sm text-danger">
          {leave.error.message}
        </p>
      )}
    </section>
  );
}
