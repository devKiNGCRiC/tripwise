/**
 * MotionChoice.tsx — lets travellers pick how lively TripWise feels:
 *   Full → living liquid colour, reveals and smooth scrolling (default)
 *   Calm → everything holds still; lighter on slow phones and batteries
 * A native radio group styled as pills, so keyboards and screen readers just work.
 * (People whose OS asks for reduced motion always get Calm behaviour regardless.)
 */
import { useSyncExternalStore } from 'react';
import { motionPreference, type MotionPreference } from '@/lib/motionPreference';
import { cn } from '@/lib/utils/cn';

const OPTIONS: { value: MotionPreference; label: string; hint: string }[] = [
  { value: 'full', label: 'Full', hint: 'Living colour and gentle motion' },
  { value: 'calm', label: 'Calm', hint: 'Everything holds still' },
];

/** Radio group for the motion preference. */
export function MotionChoice() {
  const current = useSyncExternalStore(motionPreference.subscribe, motionPreference.get, () => 'full' as const);

  return (
    <fieldset>
      <legend className="font-display text-2xl">Motion</legend>
      <p className="mt-1 text-ink-soft">Choose Calm on slow phones or to save battery.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer flex-col rounded-2xl border px-5 py-3 transition duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
              current === option.value ? 'border-transparent bg-cta text-on-cta' : 'border-line hover:border-gold',
            )}
          >
            <input
              type="radio"
              name="motion"
              value={option.value}
              checked={current === option.value}
              onChange={() => motionPreference.set(option.value)}
              className="sr-only"
            />
            <span className="font-semibold">{option.label}</span>
            <span className="text-sm opacity-80">{option.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
