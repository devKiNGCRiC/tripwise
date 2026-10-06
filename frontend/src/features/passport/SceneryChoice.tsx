/**
 * SceneryChoice.tsx — lets travellers pick the landing page's scenery:
 *   Automatic   → TripWise decides per device (default)
 *   Realistic 3D → the full 3D world, even on a modest device
 *   Photos      → lighter on data and battery
 * A native radio group, styled as chips, so keyboards and screen readers just work.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { ScenePack } from '@/scene/quality';
import { readScenePreference, saveScenePreference } from '@/scene/scenePreference';

const OPTIONS: { value: ScenePack | null; label: string; hint: string }[] = [
  { value: null, label: 'Automatic', hint: 'Best for this device' },
  { value: 'world3d', label: 'Realistic 3D', hint: 'Full 3D world' },
  { value: 'photo', label: 'Photos', hint: 'Lighter on data' },
];

/** Radio group for the home-page scenery preference. */
export function SceneryChoice() {
  const [choice, setChoice] = useState<ScenePack | null>(readScenePreference);

  /** Save immediately; the landing page uses it next time it opens. */
  function pick(value: ScenePack | null) {
    setChoice(value);
    saveScenePreference(value);
  }

  return (
    <fieldset>
      <legend className="font-display text-lg font-extrabold font-stretch-112%">Home page scenery</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const checked = choice === option.value;
          return (
            <label
              key={option.label}
              className={cn(
                'cursor-pointer rounded-2xl border-2 border-line px-4 py-2.5 transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-sky-deep',
                checked ? 'bg-yellow text-on-accent shadow-pop-sm' : 'bg-surface hover:-translate-y-0.5',
              )}
            >
              <input type="radio" name="scenery" className="sr-only" checked={checked} onChange={() => pick(option.value)} />
              <span className="block font-semibold">{option.label}</span>
              <span className={cn('block text-sm', checked ? 'text-black/70' : 'text-ink-soft')}>{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
