/**
 * AdminPage.tsx — route /admin (admins only, guarded by AdminRoute): one part at a time
 * (`?tab=`): Overview · Travellers · Destinations · Reports · Log.
 */
import { Link, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { AdminLog, Destinations, Overview, Reports, Travellers } from '@/features/admin/panels';
import { cn } from '@/lib/utils/cn';

/** The tabs, in order. */
const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'travellers', label: 'Travellers' },
  { key: 'destinations', label: 'Destinations' },
  { key: 'reports', label: 'Reports' },
  { key: 'log', label: 'Log' },
] as const;

/** Route "/admin". */
export default function AdminPage() {
  const [params] = useSearchParams();
  const asked = params.get('tab');
  const tab = TABS.some((t) => t.key === asked) ? asked : 'overview';

  return (
    <div className="page-wrap grid gap-5 pt-28 pb-20">
      <title>Admin · TripWise</title>
      <PageHeader eyebrow="TripWise crew" title="Admin" lede="Counts, travellers, the catalogue and reports — never anyone's private trips." />
      <nav aria-label="Admin sections" className="glass flex min-w-0 max-w-full gap-1 justify-self-start overflow-x-auto rounded-full p-1 scrollbar-none">
        {TABS.map((t) => (
          <Link key={t.key} to={`?tab=${t.key}`} replace aria-current={t.key === tab ? 'page' : undefined} className={cn('rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap', t.key === tab ? 'bg-ink text-on-ink' : 'text-soft hover:text-ink')}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === 'overview' && <Overview />}
      {tab === 'travellers' && <Travellers />}
      {tab === 'destinations' && <Destinations />}
      {tab === 'reports' && <Reports />}
      {tab === 'log' && <AdminLog />}
    </div>
  );
}
