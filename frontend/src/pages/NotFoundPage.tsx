/**
 * NotFoundPage.tsx — the 404 page ("Lost luggage").
 */
import { Luggage } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <title>Lost luggage · TripWise</title>
      <Luggage className="size-14 -rotate-6 text-coral" aria-hidden />
      <p className="font-mono text-sm font-bold tracking-[0.3em] text-ink-soft">ERROR 404</p>
      <h1 className="text-5xl font-extrabold">Lost luggage</h1>
      <p className="text-ink-soft">This page missed its flight. Let’s get you somewhere better.</p>
      <Link to="/" className={buttonClasses()}>
        Back to home
      </Link>
    </div>
  );
}
