/**
 * brand.ts — TripWise's identity in one place: name, slogan (English and Hindi), sign-off, contact
 * email and brand colours. Pages, the footer, page titles and the build-time SEO pages all read it,
 * so changing the email or the wording here changes it everywhere.
 */
export const BRAND = {
  name: 'TripWise',
  /** The slogan, and its Hindi partner: "travel with vivek (wisdom)" — the "Wise" in TripWise. */
  slogan: 'Wander wisely',
  sloganHi: 'विवेक से यात्रा',
  /** The farewell under the footer and in emails. */
  signOff: 'शुभ यात्रा',
  /** One line on what TripWise is (search results, share previews, About). */
  description: 'Plan trips across India’s seven worlds with AI and real places — day-by-day plans that fit your budget, guides for 88 Indian destinations, and group trips with friends. Free.',
  /** Where to reach us (temporary address, to be replaced). */
  email: 'devkingcric@gmail.com',
  /** Brand colours: deep indigo, warm paper, saffron sun. */
  colours: { ink: '#1e2747', paper: '#f6efe3', sun: '#e8813a' },
} as const;
