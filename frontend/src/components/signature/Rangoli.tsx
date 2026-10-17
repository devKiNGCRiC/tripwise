/**
 * Rangoli.tsx — a gold rangoli mandala in fine line art that draws itself in,
 * ring by ring, then sprinkles its dots and turns very slowly.
 *
 * Built from four petal rings, three circles and a ring of dots. Lines use
 * `currentColor` (gold by default), so it follows the theme. Decorative only.
 */
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';

/** One almond petal pointing up, from radius r1 out to radius r2, w wide. */
function petal(r1: number, r2: number, w: number) {
  const bulge = -r1 - (r2 - r1) * 0.3;
  return `M0 ${-r1} C ${w} ${bulge}, ${w} ${-r2 + 12}, 0 ${-r2} C ${-w} ${-r2 + 12}, ${-w} ${bulge}, 0 ${-r1} Z`;
}

/** Rings as [petal count, inner radius, outer radius, width]. */
const RINGS: [number, number, number, number][] = [
  [8, 0, 34, 10],
  [16, 44, 110, 24],
  [16, 116, 170, 26],
  [32, 168, 200, 9],
];
/** Generous path length for the draw-in animation (longer than any petal). */
const PETAL_LENGTH = 620;

/** All petals, precomputed once (the shape never changes). */
const PETALS = RINGS.flatMap(([count, r1, r2, w], ring) =>
  Array.from({ length: count }, (_, k) => ({
    key: `${ring}-${k}`,
    d: petal(r1, r2, w),
    rotate: (360 / count) * k + ring * 5.6,
    delay: ring * 0.45 + k * 0.015,
  })),
);
const CIRCLES = [40, 114, 205].map((r, k) => ({ r, delay: k * 0.55, length: Math.ceil(2 * Math.PI * r) }));
const DOTS = Array.from({ length: 36 }, (_, k) => {
  const angle = (k / 36) * Math.PI * 2;
  return { cx: Math.cos(angle) * 140, cy: Math.sin(angle) * 140, delay: 2 + k * 0.03 };
});

/** CSS custom properties for the draw-in animation. */
const drawStyle = (length: number, delay: number) => ({ '--len': length, '--delay': `${delay}s` }) as CSSProperties;

export function Rangoli({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-210 -210 420 420"
      aria-hidden
      className={cn('animate-spin-slow text-gold', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
    >
      {PETALS.map((p) => (
        <path key={p.key} d={p.d} transform={`rotate(${p.rotate})`} className="draw-stroke" style={drawStyle(PETAL_LENGTH, p.delay)} />
      ))}
      {CIRCLES.map((c) => (
        <circle key={c.r} r={c.r} className="draw-stroke" style={drawStyle(c.length, c.delay)} />
      ))}
      {DOTS.map((dot, k) => (
        <circle
          key={k}
          cx={dot.cx.toFixed(1)}
          cy={dot.cy.toFixed(1)}
          r={2.6}
          fill="currentColor"
          stroke="none"
          className="animate-fade-in opacity-0"
          style={{ '--delay': `${dot.delay}s` } as CSSProperties}
        />
      ))}
    </svg>
  );
}
