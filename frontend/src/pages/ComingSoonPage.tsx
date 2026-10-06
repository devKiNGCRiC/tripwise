/**
 * ComingSoonPage.tsx — temporary stand-in for pages built in Plans 2 and 3.
 * Keeps every navigation link working while the app grows.
 */
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <title>{`${title} · TripWise`}</title>
      <Card className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="-rotate-6 rounded-full border-4 border-double border-green-deep px-4 py-1 text-xs font-bold tracking-[0.2em] text-green-deep">
          BOARDING SOON
        </span>
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="text-ink-soft">This part of TripWise is being built right now. Check back soon!</p>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Back to home
        </Link>
      </Card>
    </div>
  );
}
