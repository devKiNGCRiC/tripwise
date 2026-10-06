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
import { sizedImage } from '@/lib/utils/images';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { descentProgress, STAGES, stageWeight } from '../descent';

const photo = (id: string) => `https://images.unsplash.com/photo-${id}`;

/** One entry per stage: day photo, and either a night photo or `moonlit` (grade the day one). */
const SCENES: { day: string; night: string | 'moonlit' }[] = [
  { day: photo('1501630834273-4b5604d2ee31'), night: photo('1419242902214-272b3f66ee7a') }, // sky / Milky Way
  { day: photo('1454496522488-7a8e488e8606'), night: photo('1579033461380-adb47c3eb938') }, // glacier / aurora
  { day: photo('1464822759023-fed622ff2c3b'), night: photo('1519681393784-d120267933ba') }, // mountains / starry peaks
  { day: photo('1432405972618-c60b0225b8f9'), night: 'moonlit' }, // waterfall
  { day: photo('1437482078695-73f5ca6c96e2'), night: photo('1534447677768-be436bb09401') }, // river / starlit lake
  { day: photo('1500382017468-9049fed747ef'), night: 'moonlit' }, // fields at sunrise
];

/** Responsive photo: phones download ~900px, desktops ~1800px. */
function ScenePhoto({ src, className }: { src: string; className?: string }) {
  return (
    <img
      src={sizedImage(src, 1600)}
      srcSet={`${sizedImage(src, 900)} 900w, ${sizedImage(src, 1600)} 1600w, ${sizedImage(src, 2200)} 2200w`}
      sizes="100vw"
      alt=""
      decoding="async"
      className={cn('absolute inset-0 size-full object-cover transition-opacity duration-1000', className)}
    />
  );
}

export function PhotoDescent({ className }: { className?: string }) {
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
        const weight = stageWeight(i, progress);
        // Each layer drifts slowly upward as you pass through it (a gentle camera move).
        const drift = (position - i) * -4;
        return (
          <div
            key={scene.day}
            data-stage={i}
            className="absolute inset-0 will-change-[opacity,transform]"
            style={{ opacity: weight, transform: `scale(1.12) translateY(${drift}%)` }}
          >
            {i <= loadedUpTo && (
              <>
                <ScenePhoto src={scene.day} className={night ? 'opacity-0' : 'opacity-100'} />
                <ScenePhoto
                  src={scene.night === 'moonlit' ? scene.day : scene.night}
                  className={cn(
                    night ? 'opacity-100' : 'opacity-0',
                    // "Day-for-night": dark, cool, desaturated — moonlight
                    scene.night === 'moonlit' && '[filter:brightness(.38)_saturate(.55)_contrast(1.15)_hue-rotate(195deg)]',
                  )}
                />
              </>
            )}
          </div>
        );
      })}
      {/* Soft top and bottom shading so white UI text stays readable on bright photos */}
      <div className="absolute inset-0 bg-[linear-gradient(rgb(0_0_0/.25),transparent_30%,transparent_70%,rgb(0_0_0/.3))]" />
    </div>
  );
}
