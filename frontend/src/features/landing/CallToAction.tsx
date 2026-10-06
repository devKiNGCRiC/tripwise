/**
 * CallToAction.tsx — Stage 6, the Land: touchdown, and one clear next step.
 */
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { DescentStage, GlassPanel } from './DescentStage';

export function CallToAction() {
  return (
    <DescentStage name="Land" side="center">
      <GlassPanel className="mx-auto max-w-2xl">
        <h2 className="text-[clamp(38px,5.4vw,72px)] font-stretch-125%">Touchdown. Where to next?</h2>
        <p className="mx-auto mt-4 max-w-[44ch] text-lg text-ink-soft">Free to use, no card needed. Tell us where and we'll do the planning.</p>
        <Link to="/plan" className={buttonClasses({ size: 'lg', className: 'mt-7' })}>
          Start planning
        </Link>
      </GlassPanel>
    </DescentStage>
  );
}
