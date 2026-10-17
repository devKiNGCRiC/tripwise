/**
 * NotFoundPage.tsx — the 404 page ("Lost luggage" / खोया सामान), on glass over the living world.
 */
import { Link } from 'react-router';
import { WorldStage } from '@/components/layout/WorldStage';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function NotFoundPage() {
  return (
    <WorldStage>
      <title>Lost luggage · TripWise</title>
      <GlassPanel className="flex flex-col items-center gap-5 text-center">
        <p lang="hi" className="text-2xl text-accent-2">
          खोया सामान
        </p>
        <h1 className="text-[clamp(52px,8vw,84px)]">Lost luggage</h1>
        <p className="max-w-[34ch] text-xl text-soft">Error 404: this page missed its train. Let's get you somewhere better.</p>
        <Link to="/" className={buttonClasses({ size: 'lg', className: 'mt-2' })}>
          Back to home
        </Link>
      </GlassPanel>
    </WorldStage>
  );
}
