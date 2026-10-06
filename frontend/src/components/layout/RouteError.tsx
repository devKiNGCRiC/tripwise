/**
 * RouteError.tsx — shown when a page crashes or fails to load (e.g. an old cached
 * chunk after a deploy). Offers a reload instead of a blank white screen.
 */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, buttonClasses } from '@/components/ui/Button';
import NotFoundPage from '@/pages/NotFoundPage';

export function RouteError() {
  const error = useRouteError();

  // A thrown 404 response gets the friendly not-found page.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className=" text-sm font-bold tracking-[0.3em] text-ink-soft">ERROR</p>
      <h1 className="text-4xl font-extrabold">Turbulence!</h1>
      <p className="text-ink-soft">Something went wrong loading this page. A refresh usually fixes it.</p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <Link to="/" className={buttonClasses({ variant: 'secondary' })}>
          Go home
        </Link>
      </div>
    </div>
  );
}
