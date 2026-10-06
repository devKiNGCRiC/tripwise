/**
 * FestivalSky.tsx — the living background behind the hero.
 *
 * Day:   an Uttarayan kite-festival sky — paper kites rocking on their strings, and a crisp sun.
 * Night: ("Night Flight" theme) the kites fade out; stars, a moon and rising sky lanterns fade in.
 *
 * Pure decoration: aria-hidden and pointer-events-none, so it never gets in the way.
 * Day/night switching is done in CSS with the `dark:` variant — no JS needed.
 * CSS animations stop automatically for reduced-motion users (see index.css).
 */
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils/cn';

/** One kite: position (% of the sky), size (px), two paper colours, sway speed (s). */
interface KiteSpec {
  x: number;
  y: number;
  size: number;
  colors: [string, string];
  sway: number;
}

/** Hand-placed so kites fill the open sky around the hero content, not behind it. */
const KITES: KiteSpec[] = [
  { x: 2, y: 64, size: 50, colors: ['var(--trip-saffron)', 'var(--trip-red)'], sway: 6 },
  { x: 40, y: 6, size: 38, colors: ['var(--trip-yellow)', 'var(--trip-green-deep)'], sway: 8 },
  { x: 47, y: 66, size: 30, colors: ['var(--trip-red)', 'var(--trip-yellow)'], sway: 7 },
  { x: 88, y: 14, size: 46, colors: ['var(--trip-green)', 'var(--trip-orange)'], sway: 9 },
  { x: 74, y: 74, size: 34, colors: ['var(--trip-orange)', 'var(--trip-sky)'], sway: 6.5 },
];

/** Nine lanterns spread across the width, each with its own speed and head start. */
const LANTERNS = Array.from({ length: 9 }, (_, i) => ({
  left: 5 + i * 10.5,
  bottom: -40 - (i % 3) * 30,
  scale: 0.7 + (i % 3) * 0.2,
  duration: 14 + (i % 4) * 3,
  delay: -i * 2.1,
}));

/** A diamond paper kite with a cross-spar, a little tail, and a string trailing down. */
function Kite({ x, y, size, colors, sway }: KiteSpec) {
  return (
    <div
      data-kite
      className="absolute origin-bottom animate-sway transition-opacity duration-700 dark:opacity-0"
      style={{ left: `${x}%`, top: `${y}%`, '--sway-duration': `${sway}s` } as CSSProperties}
    >
      <svg width={size} height={size * 3} viewBox="0 0 40 120" className="overflow-visible">
        <path d="M20 0 L40 22 L20 50 L0 22 Z" style={{ fill: colors[0] }} stroke="#000" strokeWidth="1.6" />
        <path d="M20 0 L40 22 L20 22 Z" style={{ fill: colors[1] }} />
        <path d="M20 0 V50 M0 22 H40" stroke="#000" strokeWidth="1.2" />
        <path d="M20 50 l-5 9 h10 z" style={{ fill: colors[1] }} stroke="#000" strokeWidth="1.2" />
        <path d="M20 50 C 30 75, 5 95, 22 120" fill="none" stroke="rgb(0 0 0 / .35)" strokeWidth="1" />
      </svg>
    </div>
  );
}

export function FestivalSky({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {/* Stars: only at night */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-700 [background-image:radial-gradient(1.5px_1.5px_at_10%_20%,#fff,transparent),radial-gradient(1px_1px_at_30%_70%,#fff,transparent),radial-gradient(1.5px_1.5px_at_55%_15%,#fff,transparent),radial-gradient(1px_1px_at_75%_45%,#fff,transparent),radial-gradient(1.5px_1.5px_at_90%_80%,#fff,transparent),radial-gradient(1px_1px_at_45%_85%,#fff,transparent),radial-gradient(1px_1px_at_20%_50%,#fff,transparent),radial-gradient(1.5px_1.5px_at_65%_60%,#fff,transparent)] dark:opacity-100" />

      {/* Sun by day (crisp disc + halo rings); it shrinks into a pale moon at night. */}
      <div
        className={cn(
          'absolute top-8 right-[6%] size-36 rounded-full transition-all duration-700',
          'bg-[radial-gradient(circle_at_40%_38%,#fff3b8,var(--trip-yellow)_45%,var(--trip-saffron))]',
          'shadow-[0_0_0_22px_rgb(255_199_44/.22),0_0_0_48px_rgb(255_199_44/.12),0_0_0_80px_rgb(255_199_44/.06)]',
          'dark:top-12 dark:size-24 dark:bg-[radial-gradient(circle_at_40%_38%,#fffaf0,#e9e4d4)]',
          'dark:shadow-[0_0_0_18px_rgb(255_255_255/.06),0_0_60px_10px_rgb(255_248_236/.25)]',
        )}
      />

      {KITES.map((kite) => (
        <Kite key={`${kite.x}-${kite.y}`} {...kite} />
      ))}

      {/* Sky lanterns: hidden by day, rising slowly at night */}
      {LANTERNS.map((l) => (
        <span
          key={l.left}
          data-lantern
          className="absolute h-[30px] w-[22px] animate-rise rounded-[40%_40%_30%_30%] opacity-0 [background:radial-gradient(circle_at_50%_70%,#fff3b0,var(--trip-saffron)_55%,#b84a00)] shadow-[0_0_22px_6px_rgb(255_153_51/.55)] [animation-play-state:paused] dark:[animation-play-state:running]"
          style={
            {
              left: `${l.left}%`,
              bottom: `${l.bottom}px`,
              scale: l.scale,
              '--rise-duration': `${l.duration}s`,
              animationDelay: `${l.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
