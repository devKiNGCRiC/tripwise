/**
 * ComingSoonPage.tsx — temporary stand-in for pages built in later plans.
 * Styled as a small station board ("Boarding soon"), so every navigation link
 * still lands somewhere friendly while the app grows.
 */
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StillScenery } from '@/scene/photo/StillScenery';

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div>
      <StillScenery stage="Waterfall" />
      <GlassPanel className="mx-auto my-20 flex max-w-xl flex-col items-center gap-6 text-center">
        <title>{`${title} · TripWise`}</title>
        <div className="w-full rounded-xl border-[3px] border-black bg-yellow px-6 py-5 text-black shadow-[8px_8px_0_#000]">
          <p className="text-lg font-semibold">Boarding soon</p>
          <h1 className="mt-1 text-[clamp(32px,6vw,52px)] uppercase font-stretch-130%">{title}</h1>
        </div>
        <p className="text-xl text-ink-soft">This part of TripWise is being built right now. Check back soon.</p>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Back to home
        </Link>
      </GlassPanel>
    </div>
  );
}
