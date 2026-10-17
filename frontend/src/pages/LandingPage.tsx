/**
 * LandingPage.tsx — route "/": the Seven Worlds homepage.
 *
 * Hero (headline, planner, dossier, region bar) → "However you travel" traveller cards →
 * "One India. Seven worlds." → "Your trip. Your palette." — all glass over the living
 * landscape. While this page is open, the world tours the seven regions every 10 s
 * until the traveller picks one. "Who's travelling" is shared by the hero chips, the
 * planner and the traveller cards.
 */
import { useEffect, useState } from 'react';
import { Hero } from '@/features/landing/Hero';
import { KINDS } from '@/features/landing/kinds';
import { TravellerKinds } from '@/features/landing/TravellerKinds';
import { Worlds } from '@/features/landing/Worlds';
import { YourColours } from '@/features/landing/YourColours';
import { useWorld } from '@/world/WorldProvider';

/** Route "/": the Seven Worlds homepage. */
export default function LandingPage() {
  const { startTour, stopTour } = useWorld();
  const [who, setWho] = useState(KINDS[0].who);

  // Tour the regions only while the homepage is open.
  useEffect(() => {
    startTour();
    return stopTour;
  }, [startTour, stopTour]);

  return (
    <>
      <title>TripWise — trips across India's seven worlds</title>
      <Hero who={who} onWhoChange={setWho} />
      <TravellerKinds who={who} onWhoChange={setWho} />
      <Worlds />
      <YourColours />
    </>
  );
}
