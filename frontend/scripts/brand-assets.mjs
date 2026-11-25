/**
 * brand-assets.mjs — draws TripWise's picture files from the logo, so they always match the site:
 *
 *   npm run brand:assets
 *
 * It reads the mark's shapes from src/components/layout/BrandMark.tsx, renders small HTML pages in
 * Edge (Playwright, already a dev dependency) with the brand fonts from node_modules, and saves:
 *   public/icons/icon-192.png, icon-512.png   app icons (indigo tile, paper mark)
 *   public/icons/icon-maskable-512.png        the same with room for Android's round/squircle crop
 *   public/icons/apple-touch-icon.png         iPhone home-screen icon (180 px)
 *   public/og-image.png                       the 1200×630 picture shown when a link is shared
 * Run by hand when the logo changes; the outputs are committed.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

/** Files. */
const ROOT = new URL('../', import.meta.url);
const OUT = new URL('public/', ROOT);
/** A font file from node_modules as a data URL (a page set from a string can't read local files). */
const font = async (path) => `data:font/woff2;base64,${(await readFile(new URL(`node_modules/${path}`, ROOT))).toString('base64')}`;

/** Brand colours (same as src/lib/brand.ts). */
const INK = '#1e2747';
const PAPER = '#f6efe3';
const SUN = '#e8813a';

/** The mark's two shapes, read from BrandMark.tsx so there is one source of truth. */
async function markPaths() {
  const source = await readFile(new URL('src/components/layout/BrandMark.tsx', ROOT), 'utf8');
  const read = (name) => new RegExp(`${name} =\\s*'([^']+)'`).exec(source)?.[1];
  const gateway = read('GATEWAY_PATH');
  const ground = read('GROUND_PATH');
  if (!gateway || !ground) throw new Error('Could not read the mark from BrandMark.tsx');
  return { gateway, ground };
}

/** The mark as an SVG string in the given colour. */
const mark = ({ gateway, ground }, colour, size) =>
  `<svg viewBox="0 0 64 64" width="${size}" height="${size}"><path fill="${colour}" fill-rule="evenodd" d="${gateway}"/><circle cx="32" cy="36.5" r="7" fill="${SUN}"/><path fill="${colour}" fill-rule="evenodd" d="${ground}"/></svg>`;

/** Page styles shared by every picture: the brand fonts, no margins (filled in by main()). */
let BASE = '';
async function baseStyles() {
  return `
  @font-face { font-family: 'Fraunces'; src: url('${await font('@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2')}') format('woff2'); font-weight: 100 900; }
  @font-face { font-family: 'Jakarta'; src: url('${await font('@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2')}') format('woff2'); font-weight: 200 800; }
  @font-face { font-family: 'Tiro'; src: url('${await font('@fontsource/tiro-devanagari-hindi/files/tiro-devanagari-hindi-devanagari-400-normal.woff2')}') format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  body { width: 100vw; height: 100vh; display: grid; place-items: center; }`;
}

/** An app icon: the paper mark on an indigo tile; `scale` is the mark's share of the tile. */
const iconPage = (paths, size, scale) =>
  `<style>${BASE} body { background: ${INK}; }</style>${mark(paths, PAPER, Math.round(size * scale))}`;

/** The share picture: the logo, slogan and one line about TripWise, with a large mark on the right. */
const sharePage = (paths) => `<style>${BASE}
  body { background: ${PAPER}; color: ${INK}; grid-template-columns: 1fr auto; padding: 0 90px; gap: 40px; font-family: 'Jakarta'; }
  .lock { display: flex; align-items: center; gap: 22px; }
  .word { font-family: 'Fraunces'; font-weight: 600; font-size: 104px; letter-spacing: -0.02em; line-height: 1; }
  .slogan { margin-top: 34px; font-family: 'Fraunces'; font-weight: 500; font-size: 46px; }
  .slogan span { font-family: 'Tiro'; color: ${SUN}; }
  .line { margin-top: 18px; font-size: 28px; line-height: 1.35; color: #4a5168; max-width: 700px; }
  .big { opacity: 0.95; }
</style>
<div>
  <div class="lock">${mark(paths, INK, 112)}<div class="word">TripWise</div></div>
  <div class="slogan">Wander wisely · <span>विवेक से यात्रा</span></div>
  <div class="line">Free AI trip plans, real places and guides for 88 destinations across India’s seven worlds.</div>
</div>
<div class="big">${mark(paths, INK, 380)}</div>`;

/** Render each picture. */
async function main() {
  const paths = await markPaths();
  BASE = await baseStyles();
  await mkdir(new URL('icons/', OUT), { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge' });
  const shots = [
    { file: 'icons/icon-192.png', size: [192, 192], html: iconPage(paths, 192, 0.72) },
    { file: 'icons/icon-512.png', size: [512, 512], html: iconPage(paths, 512, 0.72) },
    // Maskable icons may be cropped to a circle: keep the mark inside the middle 80 %.
    { file: 'icons/icon-maskable-512.png', size: [512, 512], html: iconPage(paths, 512, 0.56) },
    { file: 'icons/apple-touch-icon.png', size: [180, 180], html: iconPage(paths, 180, 0.68) },
    { file: 'og-image.png', size: [1200, 630], html: sharePage(paths) },
  ];
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.size[0], height: shot.size[1] } });
    await page.setContent(`<!doctype html><meta charset="utf-8">${shot.html}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: new URL(shot.file, OUT).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
    await page.close();
    console.log(`✓ public/${shot.file}`);
  }
  await browser.close();
}

await main();
