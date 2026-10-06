/**
 * GlobeFallback.tsx — a no-WebGL globe made with plain CSS.
 *
 * Shown on small phones, for reduced-motion users, where WebGL is missing, and
 * while the 3D scene downloads. It reuses the same Earth photo, centred on India,
 * with an inner shadow for roundness and a few SVG flight arcs on top.
 */
export const GLOBE_LABEL = 'Globe with flight routes from India to Goa, Ladakh, Dubai, Paris, Bali and Tokyo';

export function GlobeFallback() {
  return (
    <div role="img" aria-label={GLOBE_LABEL} className="relative mx-auto aspect-square w-[78%]">
      <div
        className="absolute inset-0 rounded-full border-[3px] border-line shadow-[inset_-28px_-22px_60px_rgb(0_0_0/.55),inset_14px_10px_40px_rgb(255_255_255/.25)]"
        style={{
          // India sits around 71% across an equirectangular Earth map; zoom so it fills the disc.
          backgroundImage: 'url(/textures/earth.jpg)',
          backgroundSize: '210% 105%',
          backgroundPosition: '74% 30%',
        }}
      />
      {/* Decorative arcs + pins (same colours as the 3D routes) */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 overflow-visible" aria-hidden="true">
        <path d="M58 44 Q 38 10 14 24" fill="none" stroke="var(--trip-saffron)" strokeWidth="1.4" />
        <path d="M58 44 Q 80 18 96 30" fill="none" stroke="var(--trip-yellow)" strokeWidth="1.4" />
        <path d="M55 58 Q 72 66 88 78" fill="none" stroke="var(--trip-green)" strokeWidth="1.4" />
        <path d="M58 44 Q 46 44 36 50" fill="none" stroke="var(--trip-red)" strokeWidth="1.4" />
        {[
          [58, 44],
          [55, 58],
          [14, 24],
          [96, 30],
          [88, 78],
          [36, 50],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="var(--trip-yellow)" stroke="#000" strokeWidth=".5" />
        ))}
      </svg>
    </div>
  );
}
