/**
 * JourneyRail.tsx — the homepage as a journey (large screens only).
 *
 * A dotted route runs down the left edge of the screen with a tick for every section
 * that carries `data-stop="Label"`. A small plane flies down the route as you scroll;
 * stops you've passed turn gold. Hovering a stop shows its name; clicking glides there.
 * It steps aside (fades out) while a full-width pinned section (`data-pinned="true"`,
 * the journeys gallery) fills the screen. Hidden below xl, where there's no spare margin.
 */
import { Plane } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/** A section on the route: its label, its element, and where it starts along the page (0–1). */
interface Stop {
  label: string;
  el: HTMLElement;
  at: number;
}

/** How far down the page we are (0 = top, 1 = bottom). */
function scrollProgress() {
  const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

export function JourneyRail() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [current, setCurrent] = useState(0);
  const [hidden, setHidden] = useState(false);
  const planeRef = useRef<HTMLDivElement>(null);
  const stopsRef = useRef<Stop[]>([]);

  useEffect(() => {
    let frame = 0;

    /** Move the plane to the scroll position and work out which stop we're at. */
    function update() {
      frame = 0;
      const progress = scrollProgress();
      planeRef.current?.style.setProperty('--progress', String(progress));
      let index = 0;
      stopsRef.current.forEach((stop, i) => {
        if (progress + 0.02 >= stop.at) index = i;
      });
      setCurrent(index);
      // Fade out while a pinned full-width section covers the screen.
      const pinned = document.querySelector<HTMLElement>('[data-pinned="true"]');
      const rect = pinned?.getBoundingClientRect();
      setHidden(!!rect && rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5);
    }
    /** Find the sections and where each one starts, as a fraction of the scrollable page. */
    function measure() {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      stopsRef.current = [...document.querySelectorAll<HTMLElement>('[data-stop]')].map((el) => ({
        label: el.dataset.stop ?? '',
        el,
        at: Math.min(1, (el.getBoundingClientRect().top + window.scrollY) / scrollable),
      }));
      setStops(stopsRef.current);
      update();
    }

    // Measure once layout has settled, and again whenever the page changes height (images, pinned gallery).
    let measureFrame = requestAnimationFrame(measure);
    // (ResizeObserver is missing in very old browsers and in the test DOM — then we measure once.)
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            cancelAnimationFrame(measureFrame);
            measureFrame = requestAnimationFrame(measure);
          });
    resize?.observe(document.body);
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(measureFrame);
      cancelAnimationFrame(frame);
      resize?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className={cn(
        'fixed top-[18vh] bottom-[14vh] left-[calc(var(--trip-gutter)/2-6px)] z-30 hidden w-3 transition-opacity duration-500 xl:block',
        hidden && 'pointer-events-none opacity-0',
      )}
    >
      {/* The route */}
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-0 -translate-x-1/2 border-l border-dashed border-ink/25" />

      {/* Stops: a dot on the route; the name slides out on hover/focus in a small glass pill */}
      <ol>
        {stops.map((stop, i) => (
          <li key={stop.label} className="absolute left-0 -translate-y-1/2" style={{ top: `${stop.at * 100}%` }}>
            <button
              type="button"
              onClick={() => stop.el.scrollIntoView({ behavior: 'smooth' })}
              aria-current={i === current ? 'step' : undefined}
              className="group flex items-center gap-3"
            >
              <span
                aria-hidden
                className={cn(
                  'block size-3 rounded-full border transition-colors duration-500',
                  i <= current ? 'border-gold bg-gold' : 'border-ink/40 bg-paper',
                )}
              />
              <span className="glass-strong -translate-x-1 rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.2em] whitespace-nowrap text-ink uppercase opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                {stop.label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* The plane, flying down the route with the scroll */}
      <div
        ref={planeRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cta text-on-cta shadow-[0_6px_16px_-6px_rgb(0_0_0/.5)]"
        style={{ top: 'calc(var(--progress, 0) * 100%)' }}
      >
        <Plane className="size-3.5 rotate-135" />
      </div>
    </nav>
  );
}
