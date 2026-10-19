/**
 * PlanPage.tsx — route "/plan" (logged-in travellers): the planner wizard, pre-filled
 * from the traveller's usual preferences (budget, interests, pace, company — set in Account)
 * and then from the address, which wins: `?destination=Goa` from destination pages and the
 * homepage, `?who=Family` from the homepage's "who's going" choice, and trip dates from
 * the month guide (`?month=12`, or a festival's `?start=&end=`).
 */
import { useSearchParams } from 'react-router';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProfile } from '@/features/account/hooks';
import { PlannerWizard } from '@/features/planner/PlannerWizard';
import { datesFromUrl } from '@/features/planner/urlDates';
import { WHO_TO_TRAVELLERS, type PlannerValues } from '@/features/planner/schema';
import type { Preferences } from '@/lib/api/types';

/** Turn saved preferences into planner starting values (only the ones set). */
function fromPreferences(prefs: Preferences | undefined): Partial<PlannerValues> {
  if (!prefs) return {};
  return {
    ...(prefs.budget ? { budget: prefs.budget } : {}),
    ...(prefs.interests?.length ? { interests: prefs.interests } : {}),
    ...(prefs.pace ? { pace: prefs.pace } : {}),
    ...(prefs.travellers ? { travellers: prefs.travellers } : {}),
  };
}

/** Route "/plan". */
export default function PlanPage() {
  const [params] = useSearchParams();
  const profile = useProfile();
  const destination = params.get('destination')?.slice(0, 80) ?? '';
  const travellers = WHO_TO_TRAVELLERS[params.get('who') ?? ''];
  const dates = datesFromUrl(params);

  return (
    <div className="page-wrap pt-28 pb-16">
      <title>Plan a trip · TripWise</title>
      {/* Wait briefly for preferences so the form starts filled in (a failed load just starts blank). */}
      {profile.isPending ? (
        <Skeleton className="mx-auto h-96 max-w-3xl rounded-card" />
      ) : (
        <PlannerWizard initial={{ ...fromPreferences(profile.data?.preferences), destination, ...dates, ...(travellers ? { travellers } : {}) }} />
      )}
    </div>
  );
}
