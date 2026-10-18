/**
 * ProfileForm.tsx — the "Profile" section: photo, name, @username, bio, type of traveller
 * and home city. Saved together with one button; the server's answer (e.g. "That username
 * is taken") shows right above it.
 */
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api/errors';
import type { Profile, TravellerType } from '@/lib/api/types';
import { AccountSection, FormError } from './AccountSection';
import { AvatarEditor } from './AvatarEditor';
import { useUpdateProfile } from './hooks';
import { TRAVELLER_TYPE_LABEL } from './labels';

/** The Profile section. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const toast = useToast();
  const [values, setValues] = useState({
    name: profile.name,
    username: profile.username,
    bio: profile.bio,
    travellerType: profile.travellerType ?? '',
    homeCity: profile.homeCity,
  });
  const [error, setError] = useState<string | null>(null);
  /** Change one field. */
  const set = (field: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [field]: value }));

  /** Save everything in this section. */
  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        name: values.name,
        username: values.username.replace(/^@/, ''),
        bio: values.bio,
        travellerType: (values.travellerType || null) as TravellerType | null,
        homeCity: values.homeCity,
      });
      toast.show({ title: 'Profile saved', tone: 'success' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your profile couldn’t be saved. Please try again.');
    }
  }

  return (
    <AccountSection title="Profile" lede="This is what friends see on your passport.">
      <AvatarEditor profile={profile} />
      <form onSubmit={save} className="mt-6 grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={values.name} maxLength={80} onChange={(e) => set('name')(e.target.value)} autoComplete="name" />
        <Input label="Username" value={values.username} maxLength={21} onChange={(e) => set('username')(e.target.value)} hint="Friends find you by @username" autoComplete="off" />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="bio" className="text-sm font-semibold text-soft">
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={160}
            value={values.bio}
            onChange={(e) => set('bio')(e.target.value)}
            className="rounded-2xl border border-line bg-glass px-4 py-3 outline-none focus:border-accent"
            aria-describedby="bio-count"
          />
          <span id="bio-count" className="self-end text-xs text-soft">
            {values.bio.length}/160
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="traveller-type" className="text-sm font-semibold text-soft">
            Type of traveller
          </label>
          <select
            id="traveller-type"
            value={values.travellerType}
            onChange={(e) => set('travellerType')(e.target.value)}
            className="h-12 rounded-2xl border border-line bg-glass px-4 font-medium outline-none focus:border-accent [&>option]:text-[#121417]"
          >
            <option value="">Not saying</option>
            {Object.entries(TRAVELLER_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Input label="Home city" value={values.homeCity} maxLength={80} onChange={(e) => set('homeCity')(e.target.value)} autoComplete="address-level2" />
        <div className="grid gap-3 sm:col-span-2">
          <FormError message={error} />
          <Button type="submit" loading={update.isPending} className="justify-self-start">
            Save profile
          </Button>
        </div>
      </form>
    </AccountSection>
  );
}
