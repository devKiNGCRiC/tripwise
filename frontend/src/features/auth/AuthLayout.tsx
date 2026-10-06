/**
 * AuthLayout.tsx — shared look for /login and /signup.
 *
 * Real scenery fills the page (glacier for login, mountains for signup). The
 * form sits on a card whose header is a bilingual station board — "Arrivals /
 * आगमन" for people coming back, "Departures / प्रस्थान" for new travellers.
 * On desktop, a one-line promise floats over the view beside it.
 */
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { StillScenery } from '@/scene/photo/StillScenery';
import type { StageName } from '@/scene/photo/scenePhotos';

interface AuthLayoutProps {
  /** Board header, English, e.g. "Arrivals". */
  board: string;
  /** Board header in Hindi, e.g. "आगमन". */
  boardLocal: string;
  /** Which stage of the journey shows behind the page. */
  scene: StageName;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("New here? Sign up") */
  footer: ReactNode;
}

export function AuthLayout({ board, boardLocal, scene, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div>
      <StillScenery stage={scene} />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
        <Card className="mx-auto w-full max-w-md overflow-hidden">
          {/* Station-board header: always black on yellow */}
          <div className="flex items-baseline justify-between border-b-[3px] border-black bg-yellow px-6 py-3 text-black">
            <span className="font-display text-xl font-black uppercase font-stretch-130%">{board}</span>
            <span lang="hi" className="text-xl font-extrabold">
              {boardLocal}
            </span>
          </div>
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <header>
              <h1 className="text-4xl font-stretch-115%">{title}</h1>
              <p className="mt-2 text-ink-soft">{subtitle}</p>
            </header>
            {children}
            <div className="text-center text-ink-soft">{footer}</div>
          </div>
        </Card>

        {/* The promise, floating over the view (desktop only) */}
        <p
          aria-hidden
          className="hidden font-display text-6xl leading-[0.95] font-black text-white font-stretch-122% [text-shadow:0_6px_40px_rgb(0_0_0/.5)] md:block"
        >
          Collect places,
          <br />
          not things.
        </p>
      </div>
    </div>
  );
}
