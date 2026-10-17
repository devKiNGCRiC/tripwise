/**
 * PlanPage.tsx — route "/plan" (logged-in travellers): the planner wizard, pre-filled
 * from the address — `?destination=Goa` from destination pages and the homepage, and
 * `?who=Family` from the homepage's "who's going" choice.
 */
import { useSearchParams } from 'react-router';
import { PlannerWizard } from '@/features/planner/PlannerWizard';
import { WHO_TO_TRAVELLERS } from '@/features/planner/schema';

/** Route "/plan". */
export default function PlanPage() {
  const [params] = useSearchParams();
  const destination = params.get('destination')?.slice(0, 80) ?? '';
  const travellers = WHO_TO_TRAVELLERS[params.get('who') ?? ''];

  return (
    <div className="page-wrap pt-28 pb-16">
      <title>Plan a trip · TripWise</title>
      <PlannerWizard initial={{ destination, ...(travellers ? { travellers } : {}) }} />
    </div>
  );
}
