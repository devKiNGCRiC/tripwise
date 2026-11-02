/**
 * WhereAreWe.tsx — "Where are my Sahyatris?": strictly your own choice, for a while.
 *   Not sharing: Share for 1 hour / Until the Sangam / Until the trip ends (asks the phone once).
 *   Sharing:     "Sharing until 6:40 pm" and Stop sharing; while this tab is open the position is
 *                updated at most once a minute (the web app can't share in the background).
 *   The list:    who else is sharing — "near Alappuzha Beach (0.4 km) · 3 min ago" — with Open in
 *                Maps (the phone's own maps app; no paid maps).
 */
import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPinned } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useWords } from '@/features/words/WordsProvider';
import { toliApi } from '@/lib/api/endpoints';
import type { ShareFor, Toli } from '@/lib/api/types';
import { TOLI_REFRESH_MS } from '../hooks';
import { clockText } from './time';

/** Send position updates at most this often (ms). */
const UPDATE_EVERY_MS = 60_000;

/** "just now" / "3 min ago" / "2 h ago". */
function ago(iso: string) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return 'just now';
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
}

/** The phone's position once (rejects when location is refused or unavailable). */
function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unavailable'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15_000 });
  });
}

/** The where-are-we card. */
export function WhereAreWe({ toli }: { toli: Toli }) {
  const { w } = useWords();
  const queryClient = useQueryClient();
  const locations = useQuery({ queryKey: ['locations', toli.id], queryFn: () => toliApi.locations(toli.id), refetchInterval: TOLI_REFRESH_MS });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sharingUntil = locations.data?.me?.until;
  const lastSent = useRef(0);

  /** Refresh the list. */
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['locations', toli.id] });

  // While I'm sharing and this tab is open, keep my point fresh (at most once a minute).
  useEffect(() => {
    if (!sharingUntil || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - lastSent.current < UPDATE_EVERY_MS) return;
        lastSent.current = Date.now();
        void toliApi.shareLocation(toli.id, { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sharingUntil, toli.id]);

  /** Start sharing for a while. */
  async function share(choice: ShareFor) {
    setBusy(true);
    setError('');
    let position: GeolocationPosition;
    try {
      position = await currentPosition();
    } catch {
      setError('Allow location to share where you are (your phone asks first).');
      setBusy(false);
      return;
    }
    try {
      await toliApi.shareLocation(toli.id, { lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy, for: choice });
      lastSent.current = Date.now();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t share that.');
    } finally {
      setBusy(false);
    }
  }

  /** Stop sharing now. */
  async function stop() {
    setBusy(true);
    try {
      await toliApi.stopSharing(toli.id);
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const others = locations.data?.locations ?? [];
  return (
    <section aria-label={`Where are my ${w.sahyatris}?`} className="glass-strong grid gap-3 rounded-card p-5">
      <h3 className="inline-flex items-center gap-2 text-xl">
        <MapPinned aria-hidden className="size-5" /> Where are my {w.sahyatris}?
      </h3>
      <p className="text-sm text-soft">Only if they choose, only for a while, and only this {w.toli} sees it. Positions update while TripWise is open.</p>

      {sharingUntil ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-accent/10 px-3 py-2">
          <LocateFixed aria-hidden className="size-4" />
          <span className="text-sm font-semibold">Sharing until {clockText(sharingUntil)}</span>
          <Button size="sm" variant="ghost" loading={busy} onClick={() => void stop()}>
            Stop sharing
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void share('1h')}>
            Share for 1 hour
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void share('sangam')}>
            Until the {w.sangam}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void share('trip')}>
            Until the trip ends
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {others.length === 0 ? (
        <p className="text-sm text-soft">Nobody else is sharing right now.</p>
      ) : (
        <ul aria-label="Shared locations" className="grid gap-2">
          {others.map((l) => (
            <li key={l.person.id} aria-label={l.person.name} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm dark:bg-white/5">
              <span>
                <b>{l.person.name}</b> · {l.near ? `near ${l.near.name} (${l.near.km} km)` : 'away from any landmark'} · {ago(l.at)}
              </span>
              <a href={l.mapsLink} target="_blank" rel="noreferrer" className="font-semibold underline decoration-accent decoration-2 underline-offset-4">
                Open in Maps
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
