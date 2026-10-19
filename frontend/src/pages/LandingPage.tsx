/**
 * LandingPage.tsx — route "/": the Seven Worlds homepage.
 *
 * Hero (headline, planner, dossier, region bar) → the region guide (months, experiences)
 * → "However you travel" traveller cards → "One India. Seven worlds." (each world's
 * places) → "Good to go" (places at their best this month) — all glass over the living
 * landscape. Every section after the hero leads into planning; the colour tools live in
 * the navbar. While this page is open, the world tours the seven regions every 10 s
 * until the traveller picks one. "Who's travelling" is shared by the hero chips, the
 * planner and the traveller cards.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { GoodToGo } from '@/features/landing/GoodToGo';
import { Hero } from '@/features/landing/Hero';
import { KINDS } from '@/features/landing/kinds';
import { RegionGuide } from '@/features/landing/RegionGuide';
import { TravellerKinds } from '@/features/landing/TravellerKinds';
import { Worlds } from '@/features/landing/Worlds';
import { useWorld } from '@/world/WorldProvider';

/** Route "/": the Seven Worlds homepage. */
export default function LandingPage() {
  const { region, startTour, stopTour } = useWorld();
  const [who, setWho] = useState(KINDS[0].who);
  const { hash } = useLocation();

  // Arriving at "/#worlds" (navbar) or similar: glide to that section once the page has laid out.
  useEffect(() => {
    if (!hash) return;
    const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => window.clearTimeout(timer);
  }, [hash]);

  // Tour the regions only while the homepage is open.
  useEffect(() => {
    startTour();
    return stopTour;
  }, [startTour, stopTour]);

  return (
    <>
      <title>TripWise — trips across India's seven worlds</title>
      <Hero who={who} onWhoChange={setWho} />
      <RegionGuide region={region} />
      <TravellerKinds who={who} onWhoChange={setWho} />
      <Worlds />
      <GoodToGo />
    </>
  );
}
