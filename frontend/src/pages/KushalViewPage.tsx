/**
 * KushalViewPage.tsx — route /kushal/:token, for family at home (no account needed): the
 * traveller's first name and their latest check-in — the place they were near, when, their note,
 * and a rough position to open in Maps. Nothing else is ever shown.
 */
import { useQuery } from '@tanstack/react-query';
import { HeartHandshake } from 'lucide-react';
import { useParams } from 'react-router';
import { WorldStage } from '@/components/layout/WorldStage';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { kushalApi } from '@/lib/api/endpoints';

/** "10 minutes ago" — plus the time itself, for family. */
function when(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  const relative = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : minutes < 48 * 60 ? `${Math.round(minutes / 60)} h ago` : `${Math.round(minutes / 1440)} days ago`;
  return `${relative} · ${new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`;
}

/** Route "/kushal/:token". */
export default function KushalViewPage() {
  const { token = '' } = useParams();
  const view = useQuery({ queryKey: ['kushal-view', token], queryFn: () => kushalApi.view(token), select: (d) => d.kushal, retry: false, refetchInterval: 60_000 });

  return (
    <WorldStage>
      <title>Kushal · TripWise</title>
      <GlassPanel className="flex flex-col items-center gap-4 text-center">
        <HeartHandshake aria-hidden className="size-10 text-accent" />
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">
          <span lang="hi">कुशल</span> · Kushal · family check-in
        </p>
        {view.isPending && <p role="status">Loading…</p>}
        {view.isError && (
          <>
            <h1 className="text-[clamp(26px,4vw,40px)]">This Kushal link isn’t active</h1>
            <p className="text-soft">Ask your traveller for a fresh link.</p>
          </>
        )}
        {view.data && !view.data.latest && (
          <>
            <h1 className="text-[clamp(26px,4vw,40px)]">No check-in yet from {view.data.traveller}</h1>
            <p className="text-soft">This page shows their latest check-in as soon as they send one.</p>
          </>
        )}
        {view.data?.latest && (
          <>
            <h1 className="text-[clamp(26px,4vw,40px)]">{view.data.latest.place.startsWith('near ') ? `${view.data.traveller} is ${view.data.latest.place}` : `${view.data.traveller}: ${view.data.latest.place}`}</h1>
            <p className="text-soft">{when(view.data.latest.at)}</p>
            {view.data.latest.note && <p className="text-lg">“{view.data.latest.note}”</p>}
            {view.data.latest.mapsLink && (
              <a href={view.data.latest.mapsLink} target="_blank" rel="noreferrer" className="font-semibold underline decoration-accent decoration-2 underline-offset-4">
                Open in Maps
              </a>
            )}
            <p className="text-xs text-soft">Shown roughly (to about a kilometre). Only the latest check-in is kept.</p>
          </>
        )}
      </GlassPanel>
    </WorldStage>
  );
}
