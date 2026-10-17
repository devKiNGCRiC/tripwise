/**
 * RouteError.tsx — shown when a page crashes or fails to load (e.g. an old cached
 * chunk after a deploy). Says what happened and offers a reload instead of a blank screen.
 */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import NotFoundPage from '@/pages/NotFoundPage';
import { LiquidScene } from './LiquidScene';

export function RouteError() {
  const error = useRouteError();

  // A thrown 404 response gets the friendly not-found page.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <LiquidScene className="pt-20">
      <GlassPanel className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-[clamp(48px,8vw,76px)]">Turbulence</h1>
        <p className="max-w-[34ch] text-xl text-ink-soft">This page didn't load properly. Reloading usually fixes it.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
            Go home
          </Link>
        </div>
      </GlassPanel>
    </LiquidScene>
  );
}
