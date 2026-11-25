/**
 * pages.ts — ready-made pages for search engines and link previews, written at build time
 * (vite.config.ts, the "seo-pages" plugin). The app itself runs in the browser, so on its own a
 * crawler or WhatsApp would see an empty page; these give each public address its real title,
 * description, share picture, structured data and readable text. When the app starts it replaces
 * the text with the real page.
 *   publicPages   home, Explore, the info pages and every destination (with its guide)
 *   renderPage    fills the built index.html with one page's tags and text
 *   sitemapXml    every public page, for search engines
 *   robotsTxt     what crawlers may visit, and where the sitemap is
 * Pure functions (no browser or file access), so they are tested directly.
 */
import { BRAND } from '../brand';

/** The destination fields used here (from the catalogue's destinations.json). */
export interface SeoDestination {
  slug: string;
  name: string;
  country: string;
  localName?: string;
  summary: string;
  region?: string;
  image?: { url: string };
}

/** The guide fields used here (from guides.json). */
export interface SeoGuide {
  about: string;
  history: string;
  significance: string;
  thingsToDo: { title: string; detail: string }[];
  food: { name: string; detail: string }[];
}

/** One ready-made page. `body` is trusted HTML built here from escaped text. */
export interface SeoPage {
  path: string;
  title: string;
  description: string;
  body: string;
  /** Absolute picture address for link previews (the brand picture when missing). */
  image?: string;
  /** Structured data (schema.org) for search engines. */
  jsonLd?: Record<string, unknown>;
}

/** Text made safe to put inside HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const e = escapeHtml;

/** A description cut to what search results show (about 160 characters), at a word. */
function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, flat.lastIndexOf(' ', max - 1))}…`;
}

/** The shared header of every ready-made page: the brand, linking home. */
const header = `<p><a href="/">${BRAND.name}</a> — ${BRAND.slogan}</p>`;
/** Links to the info pages, at the foot of every ready-made page. */
const footer = `<p><a href="/explore">Explore</a> · <a href="/about">About</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></p>`;
/** A page body around its own content. */
const page = (content: string) => `<main class="seo-page">${header}${content}${footer}</main>`;

/** A destination's page: summary, guide sections and food, with structured data. */
function destinationPage(d: SeoDestination, guide: SeoGuide | undefined): SeoPage {
  const sections = guide
    ? [
        `<h2>About ${e(d.name)}</h2>${guide.about
          .split(/\n+/)
          .map((p) => `<p>${e(p)}</p>`)
          .join('')}`,
        `<h2>History</h2><p>${e(guide.history)}</p>`,
        `<h2>Why it matters</h2><p>${e(guide.significance)}</p>`,
        `<h2>Things to do</h2><ul>${guide.thingsToDo.map((t) => `<li><strong>${e(t.title)}</strong> — ${e(t.detail)}</li>`).join('')}</ul>`,
        `<h2>Food to try</h2><ul>${guide.food.map((f) => `<li><strong>${e(f.name)}</strong> — ${e(f.detail)}</li>`).join('')}</ul>`,
      ].join('')
    : '';
  return {
    path: `/destinations/${d.slug}`,
    title: `${d.name} · ${BRAND.name}`,
    description: clip(`${d.name}, ${d.country}: ${d.summary} Plan a trip here with ${BRAND.name}.`),
    image: d.image?.url,
    body: page(`<h1>${e(d.name)}</h1><p>${e(d.summary)}</p>${sections}<p><a href="/plan?destination=${encodeURIComponent(d.name)}">Plan a trip to ${e(d.name)}</a></p>`),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TouristDestination',
      name: d.name,
      description: d.summary,
      ...(d.image?.url ? { image: d.image.url } : {}),
      containedInPlace: { '@type': 'Country', name: d.country },
    },
  };
}

/** Every public page. */
export function publicPages(destinations: SeoDestination[], guides: Record<string, SeoGuide>): SeoPage[] {
  // Links to every destination (home and Explore list them, so crawlers can reach each one).
  const list = `<ul>${destinations.map((d) => `<li><a href="/destinations/${d.slug}">${e(d.name)}</a> — ${e(d.summary)}</li>`).join('')}</ul>`;
  const info = (path: string, name: string, heading: string, description: string): SeoPage => ({
    path,
    title: `${name} · ${BRAND.name}`,
    description,
    body: page(`<h1>${e(heading)}</h1><p>${e(description)}</p>`),
  });
  return [
    {
      path: '/',
      title: `${BRAND.name} — ${BRAND.slogan}`,
      description: BRAND.description,
      body: page(`<h1>${BRAND.name} — ${BRAND.slogan}</h1><p>${e(BRAND.description)}</p><h2>Destinations</h2>${list}`),
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: BRAND.name, slogan: BRAND.slogan, description: BRAND.description },
    },
    {
      path: '/explore',
      title: `Explore destinations · ${BRAND.name}`,
      description: clip(`Explore ${destinations.length} destinations across India’s seven worlds and beyond — by world, vibe, budget and best month, each with its best places.`),
      body: page(`<h1>Explore destinations</h1>${list}`),
    },
    info('/about', 'About', 'About TripWise', 'TripWise is a free travel planner for India’s seven worlds: AI trip plans built on real places, written guides, and group trips with friends.'),
    info('/privacy', 'Privacy', 'Privacy policy', 'What TripWise keeps, who can see it, how location sharing works, and how to delete your account.'),
    info('/terms', 'Terms', 'Terms of use', 'The terms for using TripWise: a free service, fair use, your content, and checking AI plans before you travel.'),
    info('/contact', 'Contact', 'Contact us', `Write to TripWise at ${BRAND.email} about problems, ideas or your account.`),
    ...destinations.map((d) => destinationPage(d, guides[d.slug])),
  ];
}

/** Tags this module writes (the shell's own copies are removed first). */
const OWN_TAGS = /<meta\s[^>]*?(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/g;

/** The built index.html filled with one page's tags and readable text. */
export function renderPage(template: string, p: SeoPage, siteUrl: string): string {
  const url = `${siteUrl}${p.path === '/' ? '/' : p.path}`;
  const image = p.image ?? `${siteUrl}/og-image.png`;
  const tags = [
    `<title>${e(p.title)}</title>`,
    `<meta name="description" content="${e(p.description)}" />`,
    `<link rel="canonical" href="${e(url)}" />`,
    `<meta property="og:site_name" content="${BRAND.name}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${e(p.title)}" />`,
    `<meta property="og:description" content="${e(p.description)}" />`,
    `<meta property="og:url" content="${e(url)}" />`,
    `<meta property="og:image" content="${e(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    // "<" is escaped so the data can never close the script tag early.
    ...(p.jsonLd ? [`<script type="application/ld+json">${JSON.stringify(p.jsonLd).replace(/</g, '\\u003c')}</script>`] : []),
  ].join('\n    ');
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(OWN_TAGS, '')
    .replace('</head>', `    ${tags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${p.body}</div>`);
}

/** The sitemap: every public page's full address. */
export function sitemapXml(pages: SeoPage[], siteUrl: string, lastmod: string): string {
  const urls = pages.map((p) => `  <url><loc>${e(`${siteUrl}${p.path}`)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** robots.txt: private and signed-in pages stay out of search; the sitemap is listed. */
export function robotsTxt(siteUrl: string): string {
  const privatePaths = ['/admin', '/passport', '/trips', '/tolis', '/toli/', '/kushal', '/plan', '/join/', '/t/', '/reset-password/', '/login', '/signup', '/forgot-password', '/api/'];
  return `User-agent: *\nAllow: /\n${privatePaths.map((p) => `Disallow: ${p}`).join('\n')}\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}
