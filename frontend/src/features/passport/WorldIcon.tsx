/**
 * WorldIcon.tsx — a tiny hand-drawn landmark for each of India's seven worlds, in the same
 * line style as the living landscapes: a snow peak, a camel on a dune, a ghat with a diya,
 * a temple tower, rain over green hills, a coconut palm, and clouds over hills with a root
 * bridge. Drawn in the current text colour.
 */
import type { RegionKey } from '@/lib/api/types';

/** The lines of each world's icon (24×24 grid). */
const PATHS: Record<RegionKey, string[]> = {
  himalaya: ['M2 20 9 7l4 6 3-4 6 11H2Z', 'M7.4 9.8 9 7l1.6 2.6-1.6 1.2Z', 'M14.6 11.2 16 9l1.4 2.2'],
  thar: ['M1 20c4-4 8-4 11-2s7 2 11-1', 'M7 13c1-2 3-2 3 0 0 1 1 2 2 2h1c1-3 2-4 4-4', 'M9 15v4M12 15v4M16 14v5'],
  ganga: ['M3 21h18', 'M5 21v-4h14v4', 'M7 17v-3h10v3', 'M12 10c1.5 1.5 1.5 3 0 3s-1.5-1.5 0-3Z', 'M3 8c2 1 4 1 6 0s4-1 6 0 4 1 6 0'],
  deccan: ['M8 21V9l4-6 4 6v12', 'M6 21h12', 'M9 13h6M9 17h6', 'M12 3v2'],
  ghats: ['M1 20c3-5 6-7 9-4 2-4 6-5 13 4', 'M6 4l-1 3M10 3 9 6M14 4l-1 3M18 3l-1 3', 'M1 20h22'],
  konkan: ['M12 21c1-5 1-9 0-13', 'M12 8c-3-3-7-2-8 0 3-1 5-1 8 0Z', 'M12 8c3-3 7-2 8 0-3-1-5-1-8 0Z', 'M12 8c-1-3-4-4-6-3', 'M2 21c3-1 6-1 9 0s7 1 11 0'],
  sisters: ['M2 20c3-4 5-6 8-3 2-3 5-4 12 3', 'M5 9a3 3 0 0 1 5-1 3 3 0 0 1 5 2H5Z', 'M6 18c2 2 6 2 8 0'],
};

/** One world's icon. */
export function WorldIcon({ world, className }: { world: RegionKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {PATHS[world].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
