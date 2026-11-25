/**
 * pages.test.ts — the ready-made pages written at build time for search engines and link previews:
 *   - one page for home, Explore, the four info pages and every destination
 *   - a destination page carries its title, summary, guide text, share tags and structured data
 *   - rendering fills the app's HTML shell: one title, one description, absolute links, safe text,
 *     the readable content inside #root (the app replaces it when it starts), scripts kept
 *   - the sitemap lists every page; robots.txt keeps private pages out and points to the sitemap
 */
import destinationsFile from '@catalogue/destinations.json';
import guidesFile from '@catalogue/guides.json';
import { describe, expect, it } from 'vitest';
import { publicPages, renderPage, robotsTxt, sitemapXml, type SeoDestination, type SeoGuide } from './pages';

const destinations = destinationsFile as unknown as SeoDestination[];
const guides = guidesFile.guides as unknown as Record<string, SeoGuide>;
const SITE = 'https://tripwise.example';
const pages = publicPages(destinations, guides);

/** A minimal copy of index.html's shape. */
const SHELL = `<!doctype html><html lang="en"><head>
<meta charset="UTF-8" />
<meta name="description" content="Default description" />
<title>TripWise — Wander wisely</title>
<meta property="og:title" content="TripWise — Wander wisely" />
<meta property="og:description" content="Default" />
<meta property="og:image" content="/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<script type="module" src="/assets/index.js"></script>
</head><body><div id="root"></div></body></html>`;

describe('publicPages', () => {
  it('has home, Explore, the four info pages and every destination', () => {
    const paths = pages.map((p) => p.path);
    for (const path of ['/', '/explore', '/about', '/privacy', '/terms', '/contact']) expect(paths).toContain(path);
    for (const d of destinations) expect(paths).toContain(`/destinations/${d.slug}`);
    expect(pages).toHaveLength(destinations.length + 6);
  });

  it('gives a destination page its title, summary, guide text and structured data', () => {
    const gangtok = pages.find((p) => p.path === '/destinations/gangtok')!;
    expect(gangtok.title).toBe('Gangtok · TripWise');
    expect(gangtok.description).toContain('monasteries');
    expect(gangtok.body).toContain('<h1>Gangtok</h1>');
    expect(gangtok.body).toContain(guides.gangtok.history.slice(0, 40));
    expect(gangtok.body).toContain(guides.gangtok.food[0].name);
    expect(gangtok.jsonLd).toMatchObject({ '@type': 'TouristDestination', name: 'Gangtok' });
  });

  it('still gives a destination without a guide a page (abroad)', () => {
    const paris = pages.find((p) => p.path === '/destinations/paris')!;
    expect(paris.title).toBe('Paris · TripWise');
    expect(paris.body).toContain('<h1>Paris</h1>');
  });
});

describe('renderPage', () => {
  const html = renderPage(SHELL, pages.find((p) => p.path === '/destinations/gangtok')!, SITE);

  it('replaces the defaults with one set of the page’s own tags', () => {
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<title>Gangtok · TripWise</title>');
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).toContain('<meta property="og:title" content="Gangtok · TripWise" />');
    expect(html).not.toContain('Default description');
  });

  it('uses absolute addresses for the canonical link, share URL and image', () => {
    expect(html).toContain(`<link rel="canonical" href="${SITE}/destinations/gangtok" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE}/destinations/gangtok" />`);
    expect(html).toMatch(/property="og:image" content="https:\/\//);
  });

  it('puts the readable content in #root, adds structured data and keeps the app script', () => {
    expect(html).toMatch(/<div id="root"><main[^>]*>[\s\S]*<h1>Gangtok<\/h1>/);
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('<script type="module" src="/assets/index.js"></script>');
  });

  it('escapes text so names can’t break the page', () => {
    const tricky = { path: '/x', title: 'A & B <C>', description: '"quoted"', body: '<h1>x</h1>' };
    const out = renderPage(SHELL, tricky, SITE);
    expect(out).toContain('<title>A &amp; B &lt;C&gt;</title>');
    expect(out).toContain('content="&quot;quoted&quot;"');
  });
});

describe('sitemap and robots', () => {
  it('lists every page with its full address', () => {
    const xml = sitemapXml(pages, SITE, '2026-11-25');
    expect(xml.match(/<url>/g)).toHaveLength(pages.length);
    expect(xml).toContain(`<loc>${SITE}/destinations/gangtok</loc>`);
    expect(xml).toContain(`<loc>${SITE}/</loc>`);
  });

  it('keeps private pages out and points to the sitemap', () => {
    const robots = robotsTxt(SITE);
    for (const path of ['/admin', '/passport', '/trips', '/tolis', '/kushal', '/plan']) expect(robots).toContain(`Disallow: ${path}`);
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});
