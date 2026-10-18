/**
 * PreferencesForm.tsx — "Travel preferences": the usual budget, interests, pace and company.
 * The planner starts from these, so a regular traveller fills in less every time.
 */
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/errors';
import type { Interest, Pace, Preferences, Profile, Travellers } from '@/lib/api/types';
import { AccountSection, FormError } from './AccountSection';
import { useUpdateProfile } from './hooks';

/** Interests that can be picked. */
const INTERESTS: [Interest, string][] = [
  ['food', 'Food'],
  ['culture', 'Culture'],
  ['history', 'History'],
  ['nature', 'Nature'],
  ['adventure', 'Adventure'],
  ['spiritual', 'Spiritual'],
  ['photography', 'Photography'],
  ['relaxation', 'Relaxation'],
  ['shopping', 'Shopping'],
  ['nightlife', 'Nightlife'],
];

/** A labelled select for one setting. */
function Select<T extends string>({ id, label, value, options, onChange }: { id: string; label: string; value: T | ''; options: [T, string][]; onChange: (v: T | '') => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-soft">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T | '')} className="h-12 rounded-2xl border border-line bg-glass px-4 font-medium outline-none focus:border-accent [&>option]:text-[#121417]">
        <option value="">No preference</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The Travel preferences section. */
export function PreferencesForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [prefs, setPrefs] = useState<Preferences>(profile.preferences);
  const [error, setError] = useState<string | null>(null);
  const interests = prefs.interests ?? [];

  /** Save the preferences. */
  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({ preferences: prefs });
      toast.show({ title: 'Preferences saved', tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your preferences couldn’t be saved. Please try again.');
    }
  }

  return (
    <AccountSection title="Travel preferences" lede="The planner starts from these. You can still change anything for each trip.">
      <form onSubmit={save} className="grid gap-5 sm:grid-cols-3">
        <Input
          label="Usual budget per person per day (₹)"
          type="number"
          min={500}
          step={500}
          value={prefs.budget ?? ''}
          onChange={(e) => setPrefs((p) => ({ ...p, budget: e.target.value ? Number(e.target.value) : undefined }))}
        />
        <Select<Pace>
          id="pref-pace"
          label="Usual pace"
          value={prefs.pace ?? ''}
          options={[
            ['chill', 'Chill'],
            ['balanced', 'Balanced'],
            ['packed', 'Packed'],
          ]}
          onChange={(pace) => setPrefs((p) => ({ ...p, pace: pace || undefined }))}
        />
        <Select<Travellers>
          id="pref-travellers"
          label="Usually travelling"
          value={prefs.travellers ?? ''}
          options={[
            ['solo', 'Solo'],
            ['couple', 'As a couple'],
            ['friends', 'With friends'],
            ['family', 'With family'],
          ]}
          onChange={(travellers) => setPrefs((p) => ({ ...p, travellers: travellers || undefined }))}
        />
        <div className="sm:col-span-3">
          <p className="mb-2 text-sm font-semibold text-soft">Things you love (up to 5)</p>
          <div role="group" aria-label="Favourite interests" className="flex flex-wrap gap-2">
            {INTERESTS.map(([key, label]) => (
              <Chip
                key={key}
                selected={interests.includes(key)}
                onSelectedChange={(on) =>
                  setPrefs((p) => {
                    const now = p.interests ?? [];
                    const next = on ? [...now, key].slice(0, 5) : now.filter((i) => i !== key);
                    return { ...p, interests: next };
                  })
                }
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:col-span-3">
          <FormError message={error} />
          <Button type="submit" loading={update.isPending} className="justify-self-start">
            Save preferences
          </Button>
        </div>
      </form>
    </AccountSection>
  );
}
