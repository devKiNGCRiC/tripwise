/**
 * WorldDefs.tsx — shared SVG shapes, defined once for the whole page.
 * `#archClip` is the gently pointed gateway arch (temple doors, jharokha windows) used
 * as a clip-path by the logo mark and the region thumbnails: `clip-path: url(#archClip)`.
 */
export function WorldDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <clipPath id="archClip" clipPathUnits="objectBoundingBox">
          <path d="M0,1 V0.36 C0,0.17 0.2,0.06 0.5,0 C0.8,0.06 1,0.17 1,0.36 V1 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
