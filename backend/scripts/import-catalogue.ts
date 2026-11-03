/**
 * import-catalogue.ts — builds the places catalogue from Wikidata and Wikimedia Commons.
 *
 *   npx tsx scripts/import-catalogue.ts
 *
 * Run by a developer once in a while, never by the app. For every destination in
 * scripts/catalogue/destinations.ts it asks Wikidata's public query service for notable
 * things within the search radius, keeps only travel places (services/placeKinds.ts), ranks
 * them by fame (how many Wikipedias cover them) and keeps the top 40. Photos come from
 * Commons with their author and licence; a photo without both is dropped, never shown
 * uncredited. It then writes:
 *   src/data/places.json        every place, with where the data came from and when
 *   src/data/destinations.json  the existing destinations, plus the new ones (their
 *                               highlights and photo taken from their best places)
 * Wikidata is CC0. Commons photos keep their own licences (credited wherever shown).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { classify, type PlaceKind } from '../src/services/placeKinds.js';
import type { Interest } from '../src/types/api.js';
import { cleanAuthor } from './catalogue/credit.js';
import { EXISTING, NEW, type Search } from './catalogue/destinations.js';

/** Who we are (Wikimedia asks every script to say so, with a way to reach the project). */
const USER_AGENT = 'TripWise/0.1 (https://github.com/devKiNGCRiC/tripwise)';
/** Places kept per destination. */
const KEEP = 40;
/** Width of the stored photo (Commons makes the thumbnail). */
const PHOTO_WIDTH = 1000;
/** Where the files live. */
const DESTINATIONS_FILE = new URL('../src/data/destinations.json', import.meta.url);
const PLACES_FILE = new URL('../src/data/places.json', import.meta.url);

/** A place as stored in places.json. */
export interface CataloguePlace {
  id: string;
  destination: string;
  name: string;
  description?: string;
  kind: PlaceKind;
  interests: Interest[];
  lat: number;
  lon: number;
  /** How many Wikipedias/Wikimedia sites cover it (our measure of fame). */
  fame: number;
  wikidata: string;
  wikipedia?: string;
  image?: { url: string; credit: string; creditUrl: string };
}

/** One row from the query service. */
interface Row {
  item: { value: string };
  itemLabel: { value: string };
  itemDescription?: { value: string };
  coord: { value: string };
  links: { value: string };
  types?: { value: string };
  image?: { value: string };
  article?: { value: string };
}

/** The SPARQL query for one destination: notable items near its centre, with their types. */
function query({ centre: [lat, lon], radiusKm }: Search) {
  return `SELECT ?item ?itemLabel ?itemDescription ?coord ?links ?image ?article (GROUP_CONCAT(DISTINCT ?typeLabel; separator="|") AS ?types) WHERE {
  SERVICE wikibase:around { ?item wdt:P625 ?coord . bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral . bd:serviceParam wikibase:radius "${radiusKm}" . }
  ?item wikibase:sitelinks ?links . FILTER(?links >= 1)
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
  OPTIONAL { ?item wdt:P31 ?t . ?t rdfs:label ?typeLabel . FILTER(LANG(?typeLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?item ?itemLabel ?itemDescription ?coord ?links ?image ?article ORDER BY DESC(?links) LIMIT 250`;
}

/** Fetch JSON politely: retry busy answers and dropped connections with growing waits. */
async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...init.headers } });
    } catch (error) {
      // Network trouble (timeout, reset): retry like a busy server.
      if (attempt >= 4) throw error;
    }
    if (res?.ok) return (await res.json()) as T;
    if (res && (attempt >= 4 || (res.status !== 429 && res.status < 500))) throw new Error(`${res.status} from ${url.slice(0, 80)}`);
    await sleep(2000 * 2 ** attempt);
  }
}

/** Notable items around one destination. */
async function rowsFor(search: Search): Promise<Row[]> {
  const body = new URLSearchParams({ query: query(search) });
  const data = await fetchJson<{ results: { bindings: Row[] } }>('https://query.wikidata.org/sparql', {
    method: 'POST',
    body,
    headers: { Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data.results.bindings;
}

/** "Point(76.46 15.33)" → [lat, lon]. */
function point(wkt: string): [number, number] {
  const [lon, lat] = wkt.replace(/^Point\(|\)$/g, '').split(' ').map(Number);
  return [lat, lon];
}

/** Lower-case letters and digits only, for comparing names. */
const plain = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Each destination's own photo (its Wikidata item's image), by slug — a cover for parks and
 * single sites (Manas, Unakoti) whose best photo is of the place itself, not a stop inside it.
 */
const ownPhotos = new Map<string, string>();

/** Travel places for one destination: classified, de-duplicated, best first. */
function placesFrom(rows: Row[], slug: string, destinationName: string): (CataloguePlace & { file?: string })[] {
  const seen = new Set<string>();
  const out: (CataloguePlace & { file?: string })[] = [];
  for (const row of rows) {
    const name = row.itemLabel.value;
    const qid = row.item.value.split('/').pop()!;
    // Unlabelled items show their id as the label; the destination itself isn't a stop (but its photo can be the cover).
    if (plain(name) === plain(destinationName) && row.image && !ownPhotos.has(slug)) ownPhotos.set(slug, decodeURIComponent(row.image.value.split('/Special:FilePath/').pop()!));
    if (/^Q\d+$/.test(name) || plain(name) === plain(destinationName)) continue;
    const kind = classify((row.types?.value ?? '').split('|').filter(Boolean));
    if (!kind || seen.has(plain(name))) continue;
    seen.add(plain(name));
    const [lat, lon] = point(row.coord.value);
    out.push({
      id: `p_${qid}`,
      destination: slug,
      name,
      ...(row.itemDescription ? { description: row.itemDescription.value } : {}),
      kind: kind.kind,
      interests: kind.interests,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      fame: Number(row.links.value),
      wikidata: qid,
      ...(row.article ? { wikipedia: row.article.value } : {}),
      ...(row.image ? { file: decodeURIComponent(row.image.value.split('/Special:FilePath/').pop()!) } : {}),
    });
  }
  return out.sort((a, b) => b.fame - a.fame).slice(0, KEEP);
}

/** Commons file → photo with credit (null without an author and a licence). */
async function credits(files: string[]): Promise<Map<string, CataloguePlace['image']>> {
  const found = new Map<string, CataloguePlace['image']>();
  for (let i = 0; i < files.length; i += 50) {
    const titles = files.slice(i, i + 50).map((f) => `File:${f}`).join('|');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${PHOTO_WIDTH}&titles=${encodeURIComponent(titles)}`;
    type Info = { title: string; imageinfo?: { thumburl?: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] };
    const data = await fetchJson<{ query?: { pages?: Record<string, Info>; normalized?: { from: string; to: string }[] } }>(url);
    // Commons may rename titles (spaces, capitals); map back to what we asked for.
    const back = new Map((data.query?.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      // A real, short author name (placeholders like "No machine-readable author" count as none).
      const author = cleanAuthor(meta.Artist?.value ?? '');
      const licence = meta.LicenseShortName?.value?.trim();
      if (!info?.thumburl || !author || !licence) continue;
      const asked = (back.get(page.title) ?? page.title).replace(/^File:/, '');
      // Drop Commons' tracking parameters from the photo address.
      found.set(asked, { url: info.thumburl.split('?')[0], credit: `${author} · ${licence}`, creditUrl: info.descriptionurl });
    }
    await sleep(500);
  }
  return found;
}

/** Build everything and write the two files. */
async function main() {
  const destinations = JSON.parse(await readFile(DESTINATIONS_FILE, 'utf8')) as Array<Record<string, unknown> & { slug: string; name: string }>;
  const bySlug = new Map(destinations.map((d) => [d.slug, d]));
  const searches: { search: Search; name: string }[] = [
    ...EXISTING.map((s) => ({ search: s, name: bySlug.get(s.slug)!.name })),
    ...NEW.map((d) => ({ search: d, name: d.name })),
  ];

  // 1. Places per destination (one query each, gently spaced).
  const all: (CataloguePlace & { file?: string })[] = [];
  for (const { search, name } of searches) {
    const places = placesFrom(await rowsFor(search), search.slug, name);
    console.log(`${search.slug.padEnd(18)} ${places.length} places`);
    all.push(...places);
    await sleep(1200);
  }

  // 2. Photo credits (places without a credited photo simply have none).
  const photos = await credits([...new Set([...all.flatMap((p) => (p.file ? [p.file] : [])), ...ownPhotos.values()])]);
  const places: CataloguePlace[] = all.map(({ file, ...place }) => {
    const image = file ? photos.get(file) : undefined;
    return image ? { ...place, image } : place;
  });

  // 3. New destinations: highlights and photo from their best places.
  const added = NEW.flatMap((d) => {
    const own = places.filter((p) => p.destination === d.slug);
    // Its best place's photo, or else a photo of the destination itself.
    const ownFile = ownPhotos.get(d.slug);
    const cover = own.find((p) => p.image) ?? (ownFile && photos.get(ownFile) ? { image: photos.get(ownFile) } : undefined);
    if (!cover) {
      console.warn(`! ${d.slug}: no credited photo found — left out`);
      return [];
    }
    return [
      {
        id: `d_${d.slug.replace(/-/g, '_')}`,
        slug: d.slug,
        region: d.region,
        localName: d.localName,
        name: d.name,
        country: 'India',
        vibes: d.vibes,
        budgetTier: d.budgetTier,
        bestMonths: d.bestMonths,
        summary: d.summary,
        highlights: own.slice(0, 4).map((p) => p.name),
        avgDailyCost: { amount: d.avgDailyCost, currency: 'INR' },
        image: cover.image!,
      },
    ];
  });
  // Existing Indian destinations first, then the new ones, then the rest of the world.
  const indian = destinations.filter((d) => d.country === 'India');
  const abroad = destinations.filter((d) => d.country !== 'India');
  const kept = new Set(added.map((d) => d.slug));
  const next = [...indian.filter((d) => !kept.has(d.slug)), ...added, ...abroad];

  await writeFile(DESTINATIONS_FILE, `${JSON.stringify(next, null, 2)}\n`);
  await writeFile(
    PLACES_FILE,
    `${JSON.stringify(
      {
        checked: new Date().toISOString().slice(0, 10),
        source: 'Wikidata (CC0) and Wikimedia Commons (photos, each under its own licence, credited)',
        places: places.filter((p) => kept.has(p.destination) || EXISTING.some((e) => e.slug === p.destination)),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${next.length} destinations and ${places.length} places.`);
}

await main();
