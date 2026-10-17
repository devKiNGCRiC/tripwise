/**
 * heroPlaces.ts — the places the landing hero "flies" between, with the travel facts
 * shown on its "Now arriving" panel: Hindi name, real coordinates, best season and a
 * suggested stay. Photos are free Unsplash images (Unsplash License).
 */
export interface HeroPlace {
  name: string;
  /** Name in Hindi (Devanagari). */
  local: string;
  /** One-line mood for the place. */
  line: string;
  /** Unsplash photo id. */
  photo: string;
  /** Latitude / longitude in degrees (north / east), used for the route map. */
  lat: number;
  lon: number;
  /** Best months to go, as shown to travellers. */
  season: string;
  /** Suggested length of stay. */
  stay: string;
}

export const HERO_PLACES: HeroPlace[] = [
  {
    name: 'Varanasi',
    local: 'वाराणसी',
    line: 'Dawn boats on the Ganga',
    photo: '1571536802807-30451e3955d8',
    lat: 25.3176,
    lon: 82.9739,
    season: 'Oct – Mar',
    stay: '2–3 days',
  },
  {
    name: 'Jaipur',
    local: 'जयपुर',
    line: 'Palaces in pink sandstone',
    photo: '1477587458883-47145ed94245',
    lat: 26.9124,
    lon: 75.7873,
    season: 'Oct – Mar',
    stay: '3 days',
  },
  {
    name: 'Kerala',
    local: 'केरल',
    line: 'Backwaters at an easy pace',
    photo: '1602216056096-3b40cc0c9944',
    lat: 9.4981,
    lon: 76.3388,
    season: 'Sep – Mar',
    stay: '4–5 days',
  },
  {
    name: 'Ladakh',
    local: 'लद्दाख',
    line: 'Roads to the roof of the world',
    photo: '1581793745862-99fde7fa73d2',
    lat: 34.1526,
    lon: 77.5771,
    season: 'Jun – Sep',
    stay: '6–8 days',
  },
];

/** "25.32° N · 82.97° E" — coordinates the way travellers see them on maps. */
export function formatCoords({ lat, lon }: Pick<HeroPlace, 'lat' | 'lon'>) {
  return `${lat.toFixed(2)}° N · ${lon.toFixed(2)}° E`;
}
