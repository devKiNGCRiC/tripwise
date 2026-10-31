/**
 * destinations.ts — the Explore catalogue for the mock API: the very same files the real
 * API seeds from (backend/src/data, built by scripts/import-catalogue.ts), so demo mode and
 * the real site show the same destinations and places.
 *   seedDestinations  every destination (Indian ones across all seven worlds, then abroad)
 *   seedPlaces        places at Indian destinations (Wikidata; photos from Commons, credited)
 * Photo URLs are stored without size params; components add width via `sizedImage()`.
 * Costs are rough per-person daily averages in INR, for display only.
 */
import destinations from '@catalogue/destinations.json';
import placesFile from '@catalogue/places.json';
import type { Destination, Place } from '@/lib/api/types';

/** Every destination, in catalogue order. */
export const seedDestinations = destinations as Destination[];

/** Every place, in catalogue order (most famous first within each destination). */
export const seedPlaces = placesFile.places as Place[];
