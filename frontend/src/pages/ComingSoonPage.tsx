/**
 * ComingSoonPage.tsx — temporary stand-in for pages built in later plans, so every
 * navigation link still lands somewhere friendly while the app grows.
 */
import { Link } from 'react-router';
import { LiquidScene } from '@/components/layout/LiquidScene';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <LiquidScene>
      <title>{`${title} · TripWise`}</title>
      <GlassPanel className="flex flex-col items-center gap-5 text-center">
        <p className="flex items-baseline gap-3 text-sm font-medium tracking-[0.2em] text-ink-soft uppercase">
          Boarding soon
          <span lang="hi" className="text-xl tracking-normal text-gold normal-case">
            जल्द आ रहा है
          </span>
        </p>
        <h1 className="text-[clamp(44px,7vw,72px)]">{title}</h1>
        <p className="max-w-[34ch] text-xl text-ink-soft">This part of TripWise is being built right now. Check back soon.</p>
        <Link to="/" className={buttonClasses({ variant: 'secondary', className: 'mt-2' })}>
          Back to home
        </Link>
      </GlassPanel>
    </LiquidScene>
  );
}
