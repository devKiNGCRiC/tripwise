/**
 * TripActions.tsx — the owner's trip buttons in the itinerary header:
 *   Download PDF → builds the PDF on demand (pdf/downloadPdf.ts, loaded lazily)
 *   Share        → creates a public read-only link; uses the device's share sheet when
 *                  there is one, otherwise copies the link and says "Link copied"
 */
import { Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { Itinerary } from '@/lib/api/types';
import { useShareTrip } from './hooks';

/** Header buttons for a trip the traveller owns. */
export function TripActions({ itinerary }: { itinerary: Itinerary }) {
  const share = useShareTrip(itinerary.id);
  const toast = useToast();
  const [making, setMaking] = useState(false);

  /** Make and save the PDF. */
  async function onPdf() {
    setMaking(true);
    try {
      const { downloadPdf } = await import('./pdf/downloadPdf');
      await downloadPdf(itinerary);
    } catch {
      toast.show({ title: "Couldn't make the PDF — try again.", tone: 'error' });
    } finally {
      setMaking(false);
    }
  }

  /** Create the link, then share or copy it. */
  async function onShare() {
    try {
      const { shareId } = await share.mutateAsync();
      const url = `${window.location.origin}/t/${shareId}`;
      if (navigator.share) {
        await navigator.share({ title: itinerary.title, text: `My TripWise plan: ${itinerary.title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.show({ title: 'Link copied', description: 'Anyone with the link can view this trip.', tone: 'success' });
    } catch (error) {
      // Closing the share sheet isn't an error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.show({ title: "Couldn't share right now — try again.", tone: 'error' });
    }
  }

  return (
    <>
      <Button icon={<Download aria-hidden className="size-4" />} loading={making} onClick={() => void onPdf()}>
        Download PDF
      </Button>
      <Button variant="secondary" icon={<Share2 aria-hidden className="size-4" />} loading={share.isPending} onClick={() => void onShare()}>
        Share
      </Button>
    </>
  );
}
