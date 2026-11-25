/**
 * BrandMark.tsx — the TripWise mark: a gateway (dwar) with the sun on the horizon and a winding
 * footpath (pagdandi) leading in. Drawn in the text colour (currentColor) so it is indigo on light
 * pages and paper-white in dark mode; the sun is always saffron. The same shapes are in
 * public/favicon.svg and scripts/brand-assets.mjs — keep them in step.
 */
import { BRAND } from '@/lib/brand';

/** The gateway with its opening cut out. */
export const GATEWAY_PATH =
  'M8,60 V24.2 C8,13.5 17.6,7.4 32,3.5 C46.4,7.4 56,13.5 56,24.2 V60 Z M15.5,60 V29.5 C15.5,21.8 21.8,16.8 32,13.6 C42.2,16.8 48.5,21.8 48.5,29.5 V60 Z';
/** The ground inside the gateway, with the winding footpath cut through it to the horizon. */
export const GROUND_PATH =
  'M14,46.8 C23,42.4 41,42.4 50,46.8 V60 H14 Z M24.5,60 C26.5,56 33.4,55.6 33.4,52.4 C33.4,49.6 29.8,48.6 31.3,44.6 H33 C32.4,47.6 37.6,49 37.6,52.6 C37.6,56.6 33.4,57.4 35.4,60 Z';

/** The mark on its own (decorative: the name is always written next to it or on the link). */
export function BrandMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" width={size} height={size} className={className}>
      <path fill="currentColor" fillRule="evenodd" d={GATEWAY_PATH} />
      {/* The sun sits behind the ground, rising on the horizon. */}
      <circle cx="32" cy="36.5" r="7" fill={BRAND.colours.sun} />
      <path fill="currentColor" fillRule="evenodd" d={GROUND_PATH} />
    </svg>
  );
}
