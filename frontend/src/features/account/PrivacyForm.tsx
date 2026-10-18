/**
 * PrivacyForm.tsx — "Privacy": who can see your passport (Friends, Everyone, Only me) and
 * whether journal ratings, memories and photos show on it.
 */
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/errors';
import type { Privacy, Profile } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { AccountSection, FormError } from './AccountSection';
import { useUpdateProfile } from './hooks';
import { VISIBILITY_CHOICES } from './labels';

/** The Privacy section. */
export function PrivacyForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [privacy, setPrivacy] = useState<Privacy>(profile.privacy);
  const [error, setError] = useState<string | null>(null);

  /** Save the privacy choices. */
  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({ privacy });
      toast.show({ title: 'Privacy saved', tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your privacy settings couldn’t be saved. Please try again.');
    }
  }

  return (
    <AccountSection title="Privacy" lede="Upcoming trips are never shown to anyone else.">
      <form onSubmit={save} className="grid gap-5">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-soft">Who can see my passport</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {VISIBILITY_CHOICES.map(([value, title, line]) => (
              <label
                key={value}
                className={cn(
                  'cursor-pointer rounded-2xl border p-4 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                  privacy.passport === value ? 'border-transparent bg-ink text-on-ink' : 'border-line bg-glass',
                )}
              >
                <input type="radio" name="passport-visibility" value={value} checked={privacy.passport === value} onChange={() => setPrivacy((p) => ({ ...p, passport: value }))} className="sr-only" />
                <span className="block font-semibold">{title}</span>
                <span className="text-sm opacity-80">{line}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={privacy.showJournal} onChange={(e) => setPrivacy((p) => ({ ...p, showJournal: e.target.checked }))} className="mt-1 size-4 accent-accent" />
          <span>Show my journal memories and photos to people who can see my passport</span>
        </label>
        <FormError message={error} />
        <Button type="submit" loading={update.isPending} className="justify-self-start">
          Save privacy
        </Button>
      </form>
    </AccountSection>
  );
}
