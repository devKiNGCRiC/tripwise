/**
 * NotFoundPage.tsx — the 404 page ("Lost luggage"), with a station board
 * announcing the missing platform.
 */
import { Luggage } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StillScenery } from '@/scene/photo/StillScenery';

export default function NotFoundPage() {
  return (
    <div>
      <StillScenery stage="Land" />
      <GlassPanel className="mx-auto my-20 flex max-w-xl flex-col items-center gap-5 text-center">
        <title>Lost luggage · TripWise</title>
        <Luggage className="size-16 -rotate-6 text-orange" aria-hidden />
        <h1 className="text-6xl font-stretch-125%">Lost luggage</h1>
        <p className="text-xl text-ink-soft">Error 404: this page missed its train. Let's get you somewhere better.</p>
        <Link to="/" className={buttonClasses({ size: 'lg' })}>
          Back to home
        </Link>
      </GlassPanel>
    </div>
  );
}
