/**
 * ToliPage.tsx — route /tolis/:id: one Toli — its header (name, kind, Sahyatris, invite) and
 * one tab at a time (`?tab=`): Sahyatra (the shared trip and suggestions), Decide (polls,
 * budget comfort, planning), Chaupal (the chat), Sahyatris (people and roles) and Activity.
 * A Toli you're not in (or that doesn't exist) says it isn't available.
 */
import { Link, useParams, useSearchParams } from 'react-router';
import { LoadError } from '@/components/layout/LoadError';
import { WorldStage } from '@/components/layout/WorldStage';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToli } from '@/features/toli/hooks';
import { TABS, type ToliTab } from '@/features/toli/labels';
import { DecideTab } from '@/features/toli/DecideTab';
import { SahyatraTab } from '@/features/toli/SahyatraTab';
import { SahyatrisTab } from '@/features/toli/SahyatrisTab';
import { ToliHeader } from '@/features/toli/ToliHeader';
import { ApiError } from '@/lib/api/errors';
import type { Toli } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';

/** A tab still to come (filled in by the next steps of the build). */
function Later({ title }: { title: string }) {
  return <p className="glass rounded-card p-6 text-soft">{title} is coming next.</p>;
}

/** The chosen tab's content. */
function TabContent({ tab, toli }: { tab: ToliTab; toli: Toli }) {
  if (tab === 'sahyatris') return <SahyatrisTab toli={toli} />;
  if (tab === 'sahyatra') return <SahyatraTab toli={toli} />;
  if (tab === 'decide') return <DecideTab toli={toli} />;
  return <Later title={TABS.find((t) => t.key === tab)!.label} />;
}

/** Route "/tolis/:id". */
export default function ToliPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const toli = useToli(id);
  const asked = params.get('tab');
  const tab: ToliTab = TABS.some((t) => t.key === asked) ? (asked as ToliTab) : 'sahyatra';

  if (toli.isPending) {
    return (
      <div role="status" className="page-wrap grid gap-6 pt-28 pb-20">
        <span className="sr-only">Opening the Toli…</span>
        <Skeleton className="h-48 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }
  if (toli.isError) {
    if (toli.error instanceof ApiError && toli.error.code === 'NOT_FOUND') {
      return (
        <WorldStage>
          <title>Toli not available · TripWise</title>
          <GlassPanel className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-[clamp(30px,4vw,48px)]">This Toli isn't available</h1>
            <p className="text-soft">You may have left it, or the link is old. Ask a Sahyatri for a fresh invite.</p>
            <Link to="/tolis" className={buttonClasses()}>
              Your Tolis
            </Link>
          </GlassPanel>
        </WorldStage>
      );
    }
    return <LoadError what="this Toli" onRetry={() => void toli.refetch()} />;
  }

  return (
    <div className="page-wrap grid gap-5 pt-28 pb-20">
      <title>{`${toli.data.name} · Toli · TripWise`}</title>
      <ToliHeader toli={toli.data} />
      <nav aria-label="Toli sections" className="glass flex max-w-full gap-1 justify-self-start overflow-x-auto rounded-full p-1 scrollbar-none">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={`?tab=${t.key}`}
            replace
            aria-current={t.key === tab ? 'page' : undefined}
            className={cn('rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap', t.key === tab ? 'bg-ink text-on-ink' : 'text-soft hover:text-ink')}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <TabContent tab={tab} toli={toli.data} />
    </div>
  );
}
