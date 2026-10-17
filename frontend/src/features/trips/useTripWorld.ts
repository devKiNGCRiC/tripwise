/**
 * useTripWorld.ts — show a trip's own world on the living landscape: if its destination is
 * one of India's seven worlds (known from the destination list), switch to it — without
 * overwriting the traveller's remembered pick.
 */
import { useEffect } from 'react';
import { useDestinations } from '@/features/explore/hooks';
import { useWorld } from '@/world/WorldProvider';

/** Switch the landscape to the world of `destinationName` (no-op when unknown or abroad). */
export function useTripWorld(destinationName: string | undefined) {
  const { data: destinations } = useDestinations();
  const { setRegion } = useWorld();
  const region = destinations?.find((d) => d.name.toLowerCase() === destinationName?.trim().toLowerCase())?.region;

  useEffect(() => {
    if (region) setRegion(region);
  }, [region, setRegion]);
}
