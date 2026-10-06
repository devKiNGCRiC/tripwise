/**
 * PhotoDescent.tsx — the "photo" scene pack: a fixed, full-screen stack of real
 * photographs (sky → glacier → mountains → waterfall → river → land) that
 * cross-fade as you scroll, each drifting slowly like a camera move.
 *
 * Used as the scenery on devices that skip 3D, AND as the instant first frame
 * on devices that do get 3D (the 3D world fades in on top once it's ready).
 * Night uses real night photos where good ones exist, and the film trick
 * "day-for-night" (grading the day photo into moonlight) where they don't.
 * Photos load lazily: only the current and next stages, as you approach them.
 */
import { useState, useSyncExternalStore } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { descentProgress, STAGES } from '../descent';
import { MOONLIT, SCENES, ScenePhoto } from './scenePhotos';

/** The scrolling photo scenery (see file header). */
export function PhotoDescent({ className }: { className?: string }) {
  const reduceMotion = usePrefersReducedMotion();
  const progress = useSyncExternalStore(descentProgress.subscribe, descentProgress.get, descentProgress.get);
  const { theme } = useTheme();
  const night = theme === 'dark';
  const position = progress * (STAGES.length - 1);

  // Remember the furthest stage we've needed, so photos never unload once fetched.
  const [loadedUpTo, setLoadedUpTo] = useState(1);
  const needed = Math.min(STAGES.length - 1, Math.ceil(position) + 1);
  if (needed > loadedUpTo) setLoadedUpTo(needed);

  return (
    <div aria-hidden="true" className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0f24]', className)}>
      {SCENES.map((scene, i) => {
        // The stage we're in stays fully opaque; the next one fades in ON TOP of it.
        // (Two half-transparent layers would let the dark background show through mid-way.)
        const base = Math.floor(position);
        const opacity = i === base ? 1 : i === base + 1 ? position - base : 0;
        // Each layer drifts slowly upward as you pass through it (a gentle camera move) — not for reduced motion.
        const drift = reduceMotion ? 0 : (position - i) * -4;
        return (
          <div
            key={scene.day}
            data-stage={i}
            className="absolute inset-0 will-change-[opacity,transform]"
            style={{ opacity, transform: reduceMotion ? 'scale(1.12)' : `scale(1.12) translateY(${drift}%)` }}
          >
            {/* Only the current theme's photo is fetched (saves data on the devices this pack serves) */}
            {i <= loadedUpTo &&
              (night ? (
                <ScenePhoto src={scene.night === 'moonlit' ? scene.day : scene.night} className={cn(scene.night === 'moonlit' && MOONLIT)} />
              ) : (
                <ScenePhoto src={scene.day} />
              ))}
          </div>
        );
      })}
      {/* Soft top and bottom shading so white UI text stays readable on bright photos */}
      <div className="absolute inset-0 bg-[linear-gradient(rgb(0_0_0/.25),transparent_30%,transparent_70%,rgb(0_0_0/.3))]" />
    </div>
  );
}
