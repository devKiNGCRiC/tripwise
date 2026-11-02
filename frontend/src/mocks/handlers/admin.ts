/**
 * admin.ts (mock) — the admin area and reporting for demo mode: overview, travellers (search,
 * block, plan), destinations (hide from Explore), reports of public passports, and the audit log.
 * Same routes, shapes, codes and rules as the API: admins only (others FORBIDDEN), account basics
 * only, admins can't be changed, one open report per passport, 5 reports a day.
 * Demo admin: admin@tripwise.app / admin12345.
 */
import { http, HttpResponse } from 'msw';
import { apiUrl } from '@/lib/api/config';
import type { AdminUser, ReportReason } from '@/lib/api/types';
import { seedPlaces } from '../data/destinations';
import type { MockUser } from '../data/users';
import { db } from '../db';
import { currentUser, errorResponse, latency } from './shared';

/** Travellers per page. */
const PAGE = 20;
/** Reports one person may make in 24 hours. */
const PER_DAY = 5;
/** Report reasons. */
const REASONS: ReportReason[] = ['spam', 'offensive', 'impersonation', 'other'];
/** A day in ms. */
const DAY_MS = 86_400_000;

/** Small unique ids. */
let counter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;
/** The local date of a moment ("YYYY-MM-DD"). */
const dateOf = (d: Date) => d.toLocaleDateString('en-CA');

/** Run a handler for a signed-in admin (401 signed out, 403 for everyone else). */
async function asAdmin(request: Request, run: (admin: MockUser) => Response | Promise<Response>) {
  await latency();
  const user = currentUser(request);
  if (!user) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
  if (user.role !== 'admin') return errorResponse(403, 'FORBIDDEN', 'Admins only.');
  return run(user);
}

/** A traveller as admins see them (account basics and trip count — nothing private). */
const adminUser = (u: MockUser): AdminUser => ({
  id: u.id,
  name: u.name,
  username: u.username,
  email: u.email,
  role: u.role,
  plan: u.plan ?? 'free',
  blocked: u.blocked,
  joined: u.createdAt,
  trips: db.itineraries.filter((t) => t.ownerId === u.id).length,
});

/** Write one line to the audit log. */
const log = (adminId: string, action: string, targetType: 'user' | 'destination' | 'report', target: string, detail: string) =>
  db.adminActions.unshift({ id: newId('aa'), adminId, action, targetType, target, detail, at: new Date().toISOString() });

/** A destination as admins see it. */
function adminDestination(slug: string) {
  const d = db.destinations.find((x) => x.slug === slug)!;
  const monthAgo = Date.now() - 30 * DAY_MS;
  return {
    slug: d.slug,
    name: d.name,
    region: d.region ?? null,
    country: d.country,
    bestMonths: d.bestMonths,
    places: seedPlaces.filter((p) => p.destination === d.slug).length,
    trips30d: db.itineraries.filter((t) => t.request.destination.toLowerCase() === d.name.toLowerCase() && Date.parse(t.createdAt) >= monthAgo).length,
    hidden: db.hiddenDestinations.includes(d.slug),
  };
}

export const adminHandlers = [
  http.get(apiUrl('/admin/overview'), ({ request }) =>
    asAdmin(request, () => {
      const now = Date.now();
      const weekAgo = now - 7 * DAY_MS;
      const recent = db.itineraries.filter((t) => Date.parse(t.createdAt) >= weekAgo);
      const by = (source: string) => recent.filter((t) => (t.source ?? 'ai') === source).length;
      const today = dateOf(new Date());
      const top = new Map<string, number>();
      for (const t of db.itineraries.filter((x) => Date.parse(x.createdAt) >= now - 30 * DAY_MS)) top.set(t.request.destination, (top.get(t.request.destination) ?? 0) + 1);
      return HttpResponse.json({
        overview: {
          travellers: { total: db.users.length, newThisWeek: db.users.filter((u) => Date.parse(u.createdAt) >= weekAgo).length },
          trips7d: { ai: by('ai'), cache: by('cache'), local: by('local') },
          today: {
            plans: Object.values(db.generations).reduce((s, g) => s + (g.day === today ? g.used : 0), 0),
            regens: 0,
            asks: Object.values(db.asks).reduce((s, a) => s + (a.day === today ? a.used : 0), 0),
          },
          tolis: db.tolis.length,
          signups30d: Array.from({ length: 30 }, (_, i) => {
            const date = dateOf(new Date(now - (29 - i) * DAY_MS));
            return { date, count: db.users.filter((u) => dateOf(new Date(u.createdAt)) === date).length };
          }),
          topDestinations: [...top.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 10)
            .map(([name, trips]) => ({ name, trips })),
        },
      });
    }),
  ),

  http.get(apiUrl('/admin/users'), ({ request }) =>
    asAdmin(request, () => {
      const params = new URL(request.url).searchParams;
      const q = (params.get('q') ?? '').trim().replace(/^@/, '').toLowerCase();
      const page = Math.max(1, Number(params.get('page')) || 1);
      const found = db.users.filter((u) => !q || [u.name, u.email, u.username].some((f) => f.toLowerCase().includes(q))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return HttpResponse.json({ users: found.slice((page - 1) * PAGE, page * PAGE).map(adminUser), total: found.length });
    }),
  ),

  http.patch(apiUrl('/admin/users/:id'), ({ request, params }) =>
    asAdmin(request, async (admin) => {
      const change = (await request.json()) as { blocked?: boolean; plan?: string };
      const user = db.users.find((u) => u.id === params.id);
      if (!user) return errorResponse(404, 'NOT_FOUND', 'That traveller isn’t here.');
      if (user.role === 'admin') return errorResponse(409, 'CONFLICT', 'Admins can’t be blocked or changed here.');
      if (change.plan !== undefined && !['free', 'premium'].includes(change.plan)) return errorResponse(400, 'VALIDATION', 'Pick free or premium.');
      if (change.blocked !== undefined && change.blocked !== user.blocked) {
        user.blocked = change.blocked;
        log(admin.id, change.blocked ? 'block' : 'unblock', 'user', user.name, change.blocked ? 'blocked' : 'unblocked');
      }
      if (change.plan !== undefined && change.plan !== user.plan) {
        user.plan = change.plan as 'free' | 'premium';
        log(admin.id, 'plan', 'user', user.name, change.plan);
      }
      return HttpResponse.json({ user: adminUser(user) });
    }),
  ),

  http.get(apiUrl('/admin/destinations'), ({ request }) => asAdmin(request, () => HttpResponse.json({ destinations: db.destinations.map((d) => adminDestination(d.slug)) }))),

  http.patch(apiUrl('/admin/destinations/:slug'), ({ request, params }) =>
    asAdmin(request, async (admin) => {
      const { hidden } = (await request.json()) as { hidden: boolean };
      const destination = db.destinations.find((d) => d.slug === params.slug);
      if (!destination) return errorResponse(404, 'NOT_FOUND', 'That destination isn’t in the catalogue.');
      db.hiddenDestinations = db.hiddenDestinations.filter((s) => s !== destination.slug);
      if (hidden) db.hiddenDestinations.push(destination.slug);
      log(admin.id, hidden ? 'hide' : 'show', 'destination', destination.name, hidden ? 'hidden from Explore' : 'shown in Explore');
      return HttpResponse.json({ destination: adminDestination(destination.slug) });
    }),
  ),

  http.get(apiUrl('/admin/reports'), ({ request }) =>
    asAdmin(request, () => {
      const status = new URL(request.url).searchParams.get('status') ?? 'open';
      const card = (id: string) => {
        const u = db.users.find((x) => x.id === id);
        return u ? { id, name: u.name, username: u.username, bio: u.bio, blocked: u.blocked } : { id, name: 'Deleted account', username: '', bio: '', blocked: false };
      };
      return HttpResponse.json({
        reports: db.reports
          .filter((r) => r.status === status)
          .map((r) => ({
            id: r.id,
            reason: r.reason,
            ...(r.note ? { note: r.note } : {}),
            status: r.status,
            ...(r.action ? { action: r.action } : {}),
            reporter: (({ id, name, username }) => ({ id, name, username }))(card(r.reporterId)),
            target: card(r.targetId),
            createdAt: r.createdAt,
          })),
      });
    }),
  ),

  http.post(apiUrl('/admin/reports/:id'), ({ request, params }) =>
    asAdmin(request, async (admin) => {
      const { action } = (await request.json()) as { action: 'dismiss' | 'remove-content' | 'block' };
      const report = db.reports.find((r) => r.id === params.id);
      if (!report) return errorResponse(404, 'NOT_FOUND', 'That report isn’t here.');
      const target = db.users.find((u) => u.id === report.targetId);
      if (target && action === 'remove-content') {
        target.bio = '';
        delete target.avatarVersion;
        delete db.avatars[target.id];
        target.privacy = { ...target.privacy, passport: 'friends' };
      }
      if (target && action === 'block') target.blocked = true;
      report.status = action === 'dismiss' ? 'dismissed' : 'actioned';
      report.action = action;
      log(admin.id, 'report', 'report', target?.name ?? 'Deleted account', action === 'dismiss' ? 'dismissed' : action === 'block' ? 'blocked the account' : 'removed content');
      return HttpResponse.json({ report: { id: report.id, status: report.status, action } });
    }),
  ),

  http.get(apiUrl('/admin/actions'), ({ request }) =>
    asAdmin(request, () =>
      HttpResponse.json({
        actions: db.adminActions.slice(0, 100).map((a) => ({ id: a.id, admin: { id: a.adminId, name: db.users.find((u) => u.id === a.adminId)?.name ?? 'Former admin' }, action: a.action, targetType: a.targetType, target: a.target, detail: a.detail, at: a.at })),
      }),
    ),
  ),

  // ── Reporting (any signed-in traveller) ──
  http.post(apiUrl('/reports'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return errorResponse(401, 'UNAUTHORIZED', 'Please log in again.');
    const input = (await request.json()) as { username?: string; reason?: ReportReason; note?: string };
    if (!input.reason || !REASONS.includes(input.reason)) return errorResponse(400, 'VALIDATION', 'Pick a reason.');
    if (input.note && input.note.length > 300) return errorResponse(400, 'VALIDATION', 'Keep the note under 300 characters.');
    const target = db.users.find((u) => u.username === (input.username ?? '').toLowerCase().replace(/^@/, ''));
    if (!target) return errorResponse(404, 'NOT_FOUND', 'We couldn’t find that traveller.');
    if (target.id === me.id) return errorResponse(400, 'VALIDATION', 'You can’t report yourself.');
    if (db.reports.some((r) => r.reporterId === me.id && r.targetId === target.id && r.status === 'open')) return errorResponse(409, 'CONFLICT', 'You’ve already reported this passport — an admin will look at it.');
    if (db.reports.filter((r) => r.reporterId === me.id && Date.parse(r.createdAt) > Date.now() - DAY_MS).length >= PER_DAY) return errorResponse(429, 'QUOTA_EXCEEDED', 'You’ve sent 5 reports today — thank you. Try again tomorrow.');
    const report = { id: newId('rp'), reporterId: me.id, targetId: target.id, reason: input.reason, ...(input.note?.trim() ? { note: input.note.trim() } : {}), status: 'open' as const, createdAt: new Date().toISOString() };
    db.reports.unshift(report);
    return HttpResponse.json({ report: { id: report.id } }, { status: 201 });
  }),
];
