/**
 * write-guides.ts — writes destination guides into src/data/guides.json (run by hand, offline):
 *
 *   npm run write:guides -- --missing           every destination without a guide yet
 *   npm run write:guides -- --only gangtok,ziro  just these (rewrites them)
 *
 * For each destination it reads the plain text of its Wikivoyage and Wikipedia pages (cached in
 * .cache/guides/ so re-runs don't fetch again), has the AI write short sections from ONLY those
 * texts, checks them (services/guideRules.ts) and saves the ones that pass. Failures are listed
 * at the end to fix by hand or retry. Requests name TripWise with the project link — never a person.
 */
import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnv } from '../src/config/env.js';
import { buildChain } from '../src/services/ai/index.js';
import type { Guide } from '../src/services/guideRules.js';
import { writeGuide, type FetchSource } from './guides/writeGuide.js';

/** Files. */
const DESTINATIONS_FILE = new URL('../src/data/destinations.json', import.meta.url);
const GUIDES_FILE = new URL('../src/data/guides.json', import.meta.url);
const CACHE_DIR = new URL('../.cache/guides/', import.meta.url);
/** Who is asking (Wikimedia asks for an identifying User-Agent). */
const USER_AGENT = 'TripWise/1.0 (+https://github.com/devKiNGCRiC/tripwise)';

/** Wait a little between requests (be gentle with the free services). */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A page's plain text from Wikivoyage or Wikipedia (cached), or null if there's no such page (or only a disambiguation page). */
const fetchSource: FetchSource = async (wiki, title) => {
  const cacheFile = new URL(`${wiki}-${encodeURIComponent(title)}.json`, CACHE_DIR);
  try {
    return JSON.parse(await readFile(cacheFile, 'utf8'));
  } catch {
    // Not cached yet.
  }
  const url = `https://en.${wiki}.org/w/api.php?action=query&prop=extracts|pageprops&ppprop=disambiguation&explaintext=1&redirects=1&format=json&formatversion=2&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${wiki} ${title}: HTTP ${res.status}`);
  const body = (await res.json()) as { query?: { pages?: { title: string; missing?: boolean; extract?: string; pageprops?: object }[] } };
  const page = body.query?.pages?.[0];
  const result = page && !page.missing && !page.pageprops && page.extract && page.extract.length > 300 ? { title: page.title, text: page.extract, url: `https://en.${wiki}.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` } : null;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(result));
  await sleep(500);
  return result;
};

/** Run the writer. */
async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1]?.split(',')) : null;
  const missing = args.includes('--missing');
  if (!only && !missing) throw new Error('Say which: --missing, or --only slug,slug');

  const destinations = (JSON.parse(await readFile(DESTINATIONS_FILE, 'utf8')) as { slug: string; name: string; country: string }[]).filter((d) => d.country === 'India');
  let guides: Record<string, Guide> = {};
  try {
    guides = JSON.parse(await readFile(GUIDES_FILE, 'utf8')).guides ?? {};
  } catch {
    // First run.
  }
  const todo = destinations.filter((d) => (only ? only.has(d.slug) : !guides[d.slug]));
  const ai = buildChain(loadEnv());
  const today = new Date().toISOString().slice(0, 10);
  const failed: string[] = [];

  for (const d of todo) {
    try {
      const result = await writeGuide(d, { ai, fetchSource, today });
      if (result.ok) {
        guides[d.slug] = result.guide;
        console.log(`✓ ${d.slug}: ${result.guide.thingsToDo.length} things, ${result.guide.food.length} dishes`);
        // Save after each one, so a stopped run keeps what it finished.
        await writeFile(GUIDES_FILE, `${JSON.stringify({ licence: 'Text adapted from Wikivoyage and Wikipedia, CC BY-SA 4.0 (each guide lists its sources)', guides }, null, 2)}\n`);
      } else {
        failed.push(`${d.slug}: ${result.reasons.join('; ')}`);
        console.log(`✗ ${d.slug}: ${result.reasons.join('; ')}`);
      }
    } catch (error) {
      failed.push(`${d.slug}: ${(error as Error).message}`);
      console.log(`✗ ${d.slug}: ${(error as Error).message}`);
    }
    await sleep(4000);
  }
  console.log(`\nDone: ${todo.length - failed.length} written, ${failed.length} failed.${failed.length ? `\n${failed.join('\n')}` : ''}`);
}

await main();
