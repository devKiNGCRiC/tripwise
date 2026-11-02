/**
 * panels.tsx (admin) — the five parts of the admin area:
 *   Overview      counts: travellers, trips this week by how they were planned, today's AI use,
 *                 Tolis, sign-ups per day (30 days, simple bars), the most planned destinations
 *   Travellers    search; block / unblock; free ↔ premium (admins can't be changed here)
 *   Destinations  the catalogue; hide from Explore / show again
 *   Reports       reported public passports: dismiss, remove content, or block the account
 *   AdminLog      what admins did, newest first
 * Admins see account basics and totals only — never anyone's trips or private data.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/lib/api/endpoints';
import type { AdminReport } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';

/** Card styles. */
const CARD = 'glass-strong grid gap-4 rounded-card p-5';
/** Short month names. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One number with a label. */
function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 dark:bg-white/5">
      <p className="text-sm text-soft">{label}</p>
      <p className="font-display text-3xl">{value}</p>
      {note && <p className="text-xs text-soft">{note}</p>}
    </div>
  );
}

/** Overview. */
export function Overview() {
  const query = useQuery({ queryKey: ['admin', 'overview'], queryFn: () => adminApi.overview(), select: (d) => d.overview });
  const o = query.data;
  const peak = Math.max(1, ...(o?.signups30d.map((s) => s.count) ?? [1]));
  return (
    <section aria-label="Overview" className={CARD}>
      <h2 className="text-2xl">Overview</h2>
      {!o && <p role="status">Loading…</p>}
      {o && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Travellers" value={o.travellers.total} note={`${o.travellers.newThisWeek} new this week`} />
            <Stat label="Trips this week" value={o.trips7d.ai + o.trips7d.cache + o.trips7d.local} note={`AI ${o.trips7d.ai} · similar-trip ${o.trips7d.cache} · own planner ${o.trips7d.local}`} />
            <Stat label="AI use today" value={o.today.plans + o.today.regens + o.today.asks} note={`plans ${o.today.plans} · fresh ideas ${o.today.regens} · questions ${o.today.asks}`} />
            <Stat label="Tolis" value={o.tolis} />
          </div>
          <div className="grid gap-2">
            <h3 className="text-lg">Sign-ups, last 30 days</h3>
            <ul aria-label="Sign-ups, last 30 days" className="flex h-28 items-end gap-1">
              {o.signups30d.map((d) => (
                <li key={d.date} title={`${d.date}: ${d.count}`} aria-label={`${d.date}: ${d.count}`} className="flex-1 rounded-t bg-accent/70" style={{ height: `${Math.max(3, (d.count / peak) * 100)}%` }} />
              ))}
            </ul>
          </div>
          <div className="grid gap-2">
            <h3 className="text-lg">Most planned (30 days)</h3>
            {o.topDestinations.length === 0 && <p className="text-sm text-soft">No trips yet.</p>}
            <ol className="grid gap-1 text-sm">
              {o.topDestinations.map((d) => (
                <li key={d.name} className="flex justify-between rounded-xl bg-white/60 px-3 py-1.5 dark:bg-white/5">
                  <span>{d.name}</span>
                  <span className="tabular-nums">{d.trips}</span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}

/** Travellers. */
export function Travellers() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const users = useQuery({ queryKey: ['admin', 'users', q], queryFn: () => adminApi.users(q) });
  const [error, setError] = useState('');

  /** Change one traveller, then refresh. */
  async function change(id: string, patch: { blocked?: boolean; plan?: 'free' | 'premium' }) {
    setError('');
    try {
      await adminApi.updateUser(id, patch);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t change that.');
    }
  }

  return (
    <section aria-label="Travellers" className={CARD}>
      <h2 className="text-2xl">Travellers</h2>
      <label className="grid gap-1 sm:max-w-sm">
        <span className="text-sm font-semibold">Search travellers</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or @username" className="h-11 rounded-2xl border border-line bg-white/70 px-4 outline-none focus:border-accent dark:bg-white/5" />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-soft">
            <tr>
              <th className="py-2">Traveller</th>
              <th>Email</th>
              <th>Joined</th>
              <th>Trips</th>
              <th>Plan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.users.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="py-2">
                  <b>{u.name}</b>
                  <br />
                  <span className="text-soft">@{u.username}</span>
                </td>
                <td>{u.email}</td>
                <td>{u.joined ? new Date(u.joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td className="tabular-nums">{u.trips}</td>
                <td>
                  {u.role === 'admin' ? (
                    'Admin'
                  ) : (
                    <button type="button" aria-label={`Make ${u.name} ${u.plan === 'free' ? 'premium' : 'free'}`} onClick={() => void change(u.id, { plan: u.plan === 'free' ? 'premium' : 'free' })} className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold capitalize">
                      {u.plan}
                    </button>
                  )}
                </td>
                <td>
                  {u.blocked && <span className="mr-2 rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">Blocked</span>}
                  {u.role !== 'admin' && (
                    <Button size="sm" variant={u.blocked ? 'secondary' : 'ghost'} aria-label={`${u.blocked ? 'Unblock' : 'Block'} ${u.name}`} onClick={() => void change(u.id, { blocked: !u.blocked })} className={cn(!u.blocked && 'text-danger')}>
                      {u.blocked ? 'Unblock' : 'Block'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.data && <p className="text-xs text-soft">{users.data.total} found (first 20 shown)</p>}
    </section>
  );
}

/** Destinations. */
export function Destinations() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['admin', 'destinations'], queryFn: () => adminApi.destinations(), select: (d) => d.destinations });

  /** Hide or show one destination. */
  async function toggle(slug: string, hidden: boolean) {
    await adminApi.updateDestination(slug, { hidden });
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
    void queryClient.invalidateQueries({ queryKey: ['destinations'] });
  }

  return (
    <section aria-label="Destinations" className={CARD}>
      <h2 className="text-2xl">Destinations</h2>
      <p className="text-sm text-soft">Hiding takes a destination out of Explore (its page answers “not found”); trips already made still open. It stays hidden after catalogue imports.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-soft">
            <tr>
              <th className="py-2">Destination</th>
              <th>Region</th>
              <th>Best months</th>
              <th>Places</th>
              <th>Trips (30 days)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.data?.map((d) => (
              <tr key={d.slug} className={cn('border-t border-line', d.hidden && 'opacity-60')}>
                <td className="py-2 font-semibold">{d.name}</td>
                <td>{d.region ?? d.country}</td>
                <td>{d.bestMonths.map((m) => MONTHS[m - 1]).join(', ')}</td>
                <td className="tabular-nums">{d.places}</td>
                <td className="tabular-nums">{d.trips30d}</td>
                <td>
                  <Button size="sm" variant={d.hidden ? 'secondary' : 'ghost'} aria-label={d.hidden ? `Show ${d.name} in Explore` : `Hide ${d.name} from Explore`} onClick={() => void toggle(d.slug, !d.hidden)}>
                    {d.hidden ? 'Show' : 'Hide'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Words for each reason. */
const REASON: Record<AdminReport['reason'], string> = { spam: 'Spam', offensive: 'Offensive', impersonation: 'Pretending to be someone', other: 'Other' };

/** Reports. */
export function Reports() {
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ['admin', 'reports'], queryFn: () => adminApi.reports(), select: (d) => d.reports });
  const [busy, setBusy] = useState('');

  /** Decide one report. */
  async function decide(id: string, action: 'dismiss' | 'remove-content' | 'block') {
    setBusy(id);
    try {
      await adminApi.decideReport(id, action);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    } finally {
      setBusy('');
    }
  }

  return (
    <section aria-label="Reports" className={CARD}>
      <h2 className="text-2xl">Reports</h2>
      <p className="text-sm text-soft">Reported public passports. Removing content clears the bio and photo and makes the passport friends-only.</p>
      {reports.data?.length === 0 && <p className="text-soft">No open reports. 🙏</p>}
      {reports.data?.map((r) => (
        <article key={r.id} aria-label={r.target.name} className="grid gap-2 rounded-2xl border border-line bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm">
            <b>{r.target.name}</b> (@{r.target.username}) · {REASON[r.reason]} · reported by {r.reporter.name} · {new Date(r.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </p>
          {r.note && <p className="text-sm">“{r.note}”</p>}
          <p className="rounded-xl bg-ink/5 px-3 py-2 text-sm">Bio: {r.target.bio || '(empty)'}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => void decide(r.id, 'dismiss')}>
              Dismiss
            </Button>
            <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => void decide(r.id, 'remove-content')}>
              Remove content
            </Button>
            <Button size="sm" disabled={busy === r.id || r.target.blocked} onClick={() => void decide(r.id, 'block')} className="bg-danger text-white">
              Block account
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}

/** The audit log. */
export function AdminLog() {
  const log = useQuery({ queryKey: ['admin', 'actions'], queryFn: () => adminApi.actions(), select: (d) => d.actions });
  return (
    <section aria-label="Log" className={CARD}>
      <h2 className="text-2xl">Log</h2>
      {log.data?.length === 0 && <p className="text-soft">Nothing yet.</p>}
      <ol className="grid gap-1.5 text-sm">
        {log.data?.map((a) => (
          <li key={a.id} className="rounded-xl bg-white/60 px-3 py-2 dark:bg-white/5">
            {`${a.admin.name} · ${a.action} · ${a.target} — ${a.detail}`}
            <span className="ml-2 text-xs text-soft">{new Date(a.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
