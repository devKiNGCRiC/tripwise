/**
 * StillScenery.tsx — a fixed scenic backdrop for pages other than the landing
 * (login, passport, 404…): one stage of the journey as a real photo, with a soft
 * veil so content stays readable. Swaps to the night photo in Night Flight.
 * No 3D here on purpose: these pages are for doing things, not flying.
 */
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { MOONLIT, SCENES, ScenePhoto, type StageName } from './scenePhotos';

export function StillScenery({ stage, className }: { stage: StageName; className?: string }) {
  const { theme } = useTheme();
  const scene = SCENES.find((s) => s.stage === stage) ?? SCENES[0];
  const night = theme === 'dark';
  const src = night && scene.night !== 'moonlit' ? scene.night : scene.day;

  return (
    <div aria-hidden="true" className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0f24]', className)}>
      <ScenePhoto src={src} className={cn('scale-105', night && scene.night === 'moonlit' && MOONLIT)} />
      {/* Veil: lighter by day, deeper at night, so glass panels and text read clearly */}
      <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/.12),rgb(0_0_0/.25))] dark:bg-[linear-gradient(rgb(5_8_23/.35),rgb(5_8_23/.6))]" />
    </div>
  );
}
