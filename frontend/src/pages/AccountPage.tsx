/**
 * AccountPage.tsx — route /passport/account: everything about your account in one calm
 * page — profile and photo, travel preferences, privacy, look & feel, security, and the
 * danger zone.
 */
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadError } from '@/components/layout/LoadError';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccountSection } from '@/features/account/AccountSection';
import { DeleteAccount } from '@/features/account/DeleteAccount';
import { useProfile } from '@/features/account/hooks';
import { PreferencesForm } from '@/features/account/PreferencesForm';
import { PrivacyForm } from '@/features/account/PrivacyForm';
import { ProfileForm } from '@/features/account/ProfileForm';
import { SecurityPanel } from '@/features/account/SecurityPanel';
import { MotionChoice } from '@/features/passport/MotionChoice';
import { ThemeToggle } from '@/theme/ThemeToggle';

/** Route "/passport/account". */
export default function AccountPage() {
  const profile = useProfile();

  return (
    <div className="mx-auto max-w-4xl px-4 pt-28 pb-20">
      <title>Account · TripWise</title>
      <Link to="/passport" className="glass mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold">
        <ArrowLeft aria-hidden className="size-4" /> Your passport
      </Link>
      <PageHeader eyebrow="खाता · Account" title="Your account" lede="Your profile, privacy and security." />

      {profile.isPending && <Skeleton className="h-96 rounded-card" />}
      {profile.isError && <LoadError what="your account" onRetry={() => void profile.refetch()} />}
      {profile.data && (
        <div className="grid gap-6">
          {/* key: re-create the forms if the profile is replaced (e.g. after deleting and logging in again) */}
          <ProfileForm key={`p-${profile.data.id}`} profile={profile.data} />
          <PreferencesForm key={`pr-${profile.data.id}`} profile={profile.data} />
          <PrivacyForm key={`pv-${profile.data.id}`} profile={profile.data} />
          <AccountSection title="Look & feel">
            <MotionChoice />
            <div className="mt-6 flex items-center gap-3 border-t border-line pt-6">
              <ThemeToggle />
              <span className="font-medium">Day or Night theme</span>
            </div>
          </AccountSection>
          <SecurityPanel />
          <DeleteAccount />
        </div>
      )}
    </div>
  );
}
