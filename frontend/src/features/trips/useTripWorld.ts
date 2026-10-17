/**
 * useTripWorld.ts — a trip's place, as TripWise knows it:
 *   useTripPlace → the destination record (photo, Hindi name, region) for a trip's
 *                  destination text, when it's one we know
 *   useTripWorld → also switches the living landscape to that place's world (for India's
 *                  seven worlds) — without overwriting the traveller's remembered pick
 */
import { useEffect } from 'react';
import { useDestinations } from '@/features/explore/hooks';
import { useWorld } from '@/world/WorldProvider';

/** The known destination behind `destinationName` (undefined when we don't know it). */
export function useTripPlace(destinationName: string | undefined) {
  const { data: destinations } = useDestinations();
  return destinations?.find((d) => d.name.toLowerCase() === destinationName?.trim().toLowerCase());
}

/** Switch the landscape to the world of `destinationName`; returns the known destination. */
export function useTripWorld(destinationName: string | undefined) {
  const place = useTripPlace(destinationName);
  const { setRegion } = useWorld();
  const region = place?.region;

  useEffect(() => {
    if (region) setRegion(region);
  }, [region, setRegion]);

  return place;
}
