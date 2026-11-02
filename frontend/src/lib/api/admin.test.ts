/**
 * admin.test.ts — the admin area through the API client, served by the demo mock (same rules as
 * the API): only admins get in; the overview; finding and blocking travellers; hiding a
 * destination; reports of public passports and their decisions; the audit log.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { db, session } from '@/mocks/db';
import { api } from './client';
import { adminApi, destinationsApi, reportsApi } from './endpoints';

/** Log in as someone (mock session). */
async function loginAs(userId: string) {
  session.set(userId);
  await api.refreshSession();
}

describe('admin (demo mock)', () => {
  beforeEach(() => loginAs('u_admin'));

  it('keeps travellers out', async () => {
    await loginAs('u_demo');
    await expect(adminApi.overview()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(adminApi.users()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('shows the overview — counts only', async () => {
    const { overview } = await adminApi.overview();
    expect(overview.travellers.total).toBe(db.users.length);
    expect(overview.signups30d).toHaveLength(30);
    expect(overview.tolis).toBe(db.tolis.length);
    expect(JSON.stringify(overview)).not.toContain('@tripwise.app');
  });

  it('finds and blocks a traveller, and logs it', async () => {
    const { users, total } = await adminApi.users('meera');
    expect(total).toBe(1);
    expect(users[0]).toMatchObject({ name: 'Meera Iyer', plan: 'free', blocked: false });
    expect((await adminApi.updateUser(users[0].id, { blocked: true })).user.blocked).toBe(true);
    expect(db.users.find((u) => u.id === 'u_meera')!.blocked).toBe(true);
    await expect(adminApi.updateUser('u_admin', { blocked: true })).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await adminApi.actions()).actions[0]).toMatchObject({ action: 'block', target: 'Meera Iyer' });
  });

  it('hides a destination from Explore', async () => {
    await adminApi.updateDestination('goa', { hidden: true });
    expect((await destinationsApi.list()).destinations.map((d) => d.slug)).not.toContain('goa');
    await expect(destinationsApi.get('goa')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await adminApi.destinations()).destinations.find((d) => d.slug === 'goa')).toMatchObject({ hidden: true });
  });

  it('takes a report and removes the reported content', async () => {
    await loginAs('u_demo');
    await reportsApi.report('meera', 'spam', 'Selling things');
    await expect(reportsApi.report('meera', 'spam')).rejects.toMatchObject({ code: 'CONFLICT' });
    await loginAs('u_admin');
    const [report] = (await adminApi.reports()).reports;
    expect(report).toMatchObject({ reason: 'spam', note: 'Selling things', reporter: { name: 'Demo Traveller' }, target: { name: 'Meera Iyer', bio: expect.stringContaining('Backpacking') } });
    await adminApi.decideReport(report.id, 'remove-content');
    expect(db.users.find((u) => u.id === 'u_meera')).toMatchObject({ bio: '', privacy: { passport: 'friends' } });
    expect((await adminApi.reports()).reports).toEqual([]);
  });
});
