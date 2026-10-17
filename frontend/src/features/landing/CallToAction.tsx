/**
 * CallToAction.tsx — the closing invitation: a kolam ornament, "Where to, यात्री?",
 * and the way into the planner, over a faint rangoli watermark.
 */
import { Link } from 'react-router';
import { Kolam } from '@/components/signature/Kolam';
import { Rangoli } from '@/components/signature/Rangoli';
import { useReveal } from '@/components/signature/useReveal';
import { buttonClasses } from '@/components/ui/Button';
import { delay } from './delay';

export function CallToAction() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section ref={reveal} aria-labelledby="cta-title" data-stop="Arrival" className="relative isolate overflow-hidden px-5 py-28 text-center md:py-40">
      <Rangoli className="absolute top-1/2 left-1/2 -z-10 w-[min(900px,140vw)] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]" />
      <Kolam className="reveal-up mx-auto mb-10 w-[min(520px,90%)]" />
      <h2 id="cta-title" className="text-[clamp(52px,min(8vw,13svh),128px)]">
        <span className="reveal-line">
          <span>Where to,</span>
        </span>{' '}
        <span className="reveal-line">
          <span lang="hi" className="italic" style={delay(0.15)}>
            यात्री?
          </span>
        </span>
      </h2>
      <p className="reveal-up mx-auto mt-6 max-w-[40ch] text-xl text-ink-soft" style={delay(0.25)}>
        Free to use, no card needed. Your first plan is a minute away.
      </p>
      <div className="reveal-up mt-9 flex flex-wrap justify-center gap-3" style={delay(0.35)}>
        <Link to="/plan" className={buttonClasses({ size: 'lg' })}>
          Start planning
        </Link>
        <Link to="/explore" className={buttonClasses({ size: 'lg', variant: 'secondary' })}>
          Explore destinations
        </Link>
      </div>
    </section>
  );
}
