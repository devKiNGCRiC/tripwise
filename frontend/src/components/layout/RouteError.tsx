/**
 * RouteError.tsx — shown when a page crashes or fails to load (e.g. an old cached
 * chunk after a deploy). Says what happened and offers a reload instead of a blank screen.
 */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import NotFoundPage from '@/pages/NotFoundPage';

export function RouteError() {
  const error = useRouteError();

  // A thrown 404 response gets the friendly not-found page.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-24 text-center">
      <h1 className="text-5xl font-stretch-125%">Turbulence</h1>
      <p className="text-xl text-ink-soft">This page didn't load properly. Reloading usually fixes it.</p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Go home
        </Link>
      </div>
    </div>
  );
}
