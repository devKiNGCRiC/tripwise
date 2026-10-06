/**
 * scenePhotos.tsx — the real photographs behind each stage of the journey,
 * shared by the scrolling PhotoDescent and the fixed StillScenery backdrops.
 * All free Unsplash photos, resized on the fly by Unsplash's CDN.
 */
import { cn } from '@/lib/utils/cn';
import { sizedImage } from '@/lib/utils/images';

const photo = (id: string) => `https://images.unsplash.com/photo-${id}`;

export type StageName = 'Sky' | 'Glacier' | 'Mountains' | 'Waterfall' | 'River' | 'Land';

/** One entry per stage: day photo, and either a night photo or `moonlit` (grade the day one). */
export const SCENES: { stage: StageName; day: string; night: string | 'moonlit' }[] = [
  { stage: 'Sky', day: photo('1501630834273-4b5604d2ee31'), night: photo('1419242902214-272b3f66ee7a') },
  { stage: 'Glacier', day: photo('1454496522488-7a8e488e8606'), night: photo('1579033461380-adb47c3eb938') },
  { stage: 'Mountains', day: photo('1464822759023-fed622ff2c3b'), night: photo('1519681393784-d120267933ba') },
  { stage: 'Waterfall', day: photo('1432405972618-c60b0225b8f9'), night: 'moonlit' },
  { stage: 'River', day: photo('1437482078695-73f5ca6c96e2'), night: photo('1534447677768-be436bb09401') },
  { stage: 'Land', day: photo('1500382017468-9049fed747ef'), night: 'moonlit' },
];

/** "Day-for-night": the film trick of grading a day photo into cool, dark moonlight. */
export const MOONLIT = '[filter:brightness(.38)_saturate(.55)_contrast(1.15)_hue-rotate(195deg)]';

/** Responsive full-bleed photo: phones download ~900px, desktops ~1600–2200px. */
export function ScenePhoto({ src, className }: { src: string; className?: string }) {
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
