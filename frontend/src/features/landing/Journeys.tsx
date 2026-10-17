/**
 * Journeys.tsx — destinations as a cinematic gallery.
 *
 * On wide screens (with motion allowed) the section pins to the viewport while you
 * scroll, and the row of photo cards slides sideways instead; each card wipes open
 * as it slides into view. On phones, or with reduced motion, it's a normal swipeable
 * row whose cards open together when the row scrolls into view.
 * Destinations come from the API (cached by TanStack Query).
 */
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useReveal } from '@/components/signature/useReveal';
import { Skeleton } from '@/components/ui/Skeleton';
import { DestinationCard } from '@/features/explore/DestinationCard';
import { useDestinations } from '@/features/explore/hooks';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { delay } from './delay';
import { SectionStop } from './SectionStop';

/** Width from which the gallery pins and scrolls sideways. */
const PIN_QUERY = '(min-width: 768px)';
/** Live "is the screen wide enough to pin?" (re-evaluates on resize/rotation). */
function subscribeWide(onChange: () => void) {
  const mql = window.matchMedia?.(PIN_QUERY);
  mql?.addEventListener?.('change', onChange);
  return () => mql?.removeEventListener?.('change', onChange);
}
const getWide = () => window.matchMedia?.(PIN_QUERY).matches ?? false;

/** Card size: tall portrait on phones, wide cinematic frame on desktop. */
const CARD = 'h-[min(62svh,560px)] w-[min(82vw,520px)] shrink-0 snap-start';

export function Journeys() {
  const { data: destinations, isPending, isError } = useDestinations();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const revealHead = useReveal<HTMLDivElement>();
  const wide = useSyncExternalStore(subscribeWide, getWide, () => false);
  const count = destinations?.length ?? 0;

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || count === 0) return;
    const cards = [...track.querySelectorAll('.wipe')];

    // ── Not pinned (phones, reduced motion): open every card once the row is on screen ──
    if (!wide || reduceMotion || typeof IntersectionObserver === 'undefined') {
      section.dataset.pinned = 'false';
      if (typeof IntersectionObserver === 'undefined' || reduceMotion) {
        cards.forEach((card) => card.classList.add('is-in'));
        return;
      }
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        cards.forEach((card) => card.classList.add('is-in'));
        io.disconnect();
      });
      io.observe(track);
      return () => io.disconnect();
    }

    // ── Pinned: vertical scroll drives the row sideways ──
    section.dataset.pinned = 'true';
    let travel = 0;
    let frame = 0;

    /** Make the section tall enough for the sideways journey (plus a little dwell at the end). */
    function measure() {
      travel = Math.max(0, track!.scrollWidth - track!.clientWidth);
      section!.style.height = `${window.innerHeight + travel + window.innerHeight * 0.25}px`;
      update();
    }
    /** Map scroll progress through the section to the row's sideways position. */
    function update() {
      frame = 0;
      const rect = section!.getBoundingClientRect();
      const total = section!.offsetHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      track!.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
      // Cards open as they slide in (clip-path hides them from IntersectionObserver, so we measure).
      if (rect.top < window.innerHeight * 0.6) {
        for (const card of cards) {
          if (!card.classList.contains('is-in') && card.getBoundingClientRect().left < window.innerWidth * 0.92) card.classList.add('is-in');
        }
      }
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(track);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      section.style.height = '';
      track.style.transform = '';
    };
  }, [count, reduceMotion, wide]);

  return (
    <section ref={sectionRef} aria-labelledby="journeys-title" data-stop="Journeys" className="group relative">
      <div className="flex flex-col justify-center py-24 group-data-[pinned=true]:sticky group-data-[pinned=true]:top-0 group-data-[pinned=true]:h-svh group-data-[pinned=true]:overflow-hidden group-data-[pinned=true]:py-0 group-data-[pinned=true]:pt-24">
        <div ref={revealHead} className="page-wrap mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionStop n="02" label="Journeys" className="reveal-up mb-4" />
            <h2 id="journeys-title" className="reveal-up max-w-[16ch] text-[clamp(36px,min(4.6vw,7svh),68px)]">
              Journeys worth slowing down for
            </h2>
          </div>
          <p className="reveal-up max-w-[38ch] text-ink-soft" style={delay(0.15)}>
            Hand-picked starting points. Every one opens a plan you can reshape in seconds.
          </p>
        </div>

        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory scroll-px-5 gap-6 overflow-x-auto px-5 pb-4 scrollbar-none group-data-[pinned=true]:snap-none group-data-[pinned=true]:overflow-visible group-data-[pinned=true]:pb-0 md:px-(--trip-gutter)"
        >
          {isPending &&
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} role={i === 0 ? 'status' : undefined} className={CARD}>
                <Skeleton className="size-full" />
                {i === 0 && <span className="sr-only">Loading destinations…</span>}
              </div>
            ))}
          {isError && <p className="text-ink-soft">Destinations are taking a breather. Refresh to try again.</p>}
          {destinations?.map((destination) => (
            <DestinationCard key={destination.id} destination={destination} className={`wipe ${CARD}`} />
          ))}
          {/* Breathing room after the last card */}
          <span aria-hidden className="w-px shrink-0 md:w-(--trip-gutter)" />
        </div>
      </div>
    </section>
  );
}
