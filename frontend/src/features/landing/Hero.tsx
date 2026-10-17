/**
 * Hero.tsx — the first screen, where the two halves of Monsoon Editorial meet:
 * full-screen photographs of India (Rangoli Editorial) that behave like water — they
 * shimmer, ripple under your pointer and pour into one another (Liquid Monsoon).
 * Day grades them in warm dawn light; Night turns them monsoon indigo with rain and a
 * lantern glow that follows the pointer.
 *
 * The travel layer: a "Now arriving" flight-tracker panel (route map, coordinates, local
 * time, season, stay, stops). On top: the headline ("India, unhurried."), the Hindi
 * line, the glass quick-plan box (hands off to the planner, through login for guests)
 * and quick picks. Type scales with the screen's width AND height, so short laptop
 * screens fit everything above the fold.
 */
import { ArrowRight } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { PhotoLiquid } from '@/components/signature/PhotoLiquid';
import { useReveal } from '@/components/signature/useReveal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { sizedImage } from '@/lib/utils/images';
import { ArrivalPanel } from './ArrivalPanel';
import { delay } from './delay';
import { HERO_PLACES } from './heroPlaces';

/** Seconds each place stays before the next one pours in. */
const SLIDE_SECONDS = 7;
/** Popular places offered as one-tap picks (fixed, so the hero never waits for the API). */
const QUICK_PICKS = ['Goa', 'Jaipur', 'Ladakh', 'Kerala', 'Varanasi'];

/** Photo URLs sized for this screen (phones get lighter files). */
function photoUrls() {
  const width = typeof window !== 'undefined' && window.innerWidth < 768 ? 1000 : 1800;
  return HERO_PLACES.map((place) => sizedImage(`https://images.unsplash.com/photo-${place.photo}`, width));
}

export function Hero() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  // Where we are and where we came from (the route map draws the flight between them).
  const [stop, setStop] = useState({ index: 0, previous: 0 });
  const [urls] = useState(photoUrls);
  const reduceMotion = usePrefersReducedMotion();
  const reveal = useReveal<HTMLElement>();

  /** Fly to place `next`. */
  const goTo = (next: number) => setStop((current) => (current.index === next ? current : { index: next, previous: current.index }));

  // Auto-advance (restarts whenever the place changes, so a click gets a full turn).
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(
      () => setStop((current) => ({ index: (current.index + 1) % HERO_PLACES.length, previous: current.index })),
      SLIDE_SECONDS * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [stop.index, reduceMotion]);

  /** Go to the planner, pre-filling the destination if one was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = destination.trim();
    navigate(trimmed ? `/plan?destination=${encodeURIComponent(trimmed)}` : '/plan');
  }

  return (
    <section ref={reveal} data-stop="Departure" className="relative isolate flex min-h-svh items-end overflow-hidden lg:items-center">
      {/* Phones: the photo fills the top of the screen only, so its subject stays in frame */}
      <PhotoLiquid urls={urls} index={stop.index} className="-z-20 max-lg:bottom-auto max-lg:h-[62svh]" />
      {/* Night: fine monsoon rain over the photo */}
      <div aria-hidden className="rain pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-1000 dark:opacity-100" />
      {/* The photo melts into the page where the words sit: from the left on desktop, from below on phones */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-paper from-55% via-paper/60 via-62% to-paper/0 to-70% lg:bg-linear-to-r lg:from-paper lg:from-20% lg:via-paper/70 lg:via-42% lg:to-paper/0 lg:to-68%"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 bg-linear-to-b from-transparent to-paper" />

      {/* Phones: the photo gets the top of the screen, the words start below it */}
      <div className="page-wrap relative pt-[46svh] pb-16 lg:pt-28 lg:pb-20">
        <div className="max-w-[min(640px,52vw)] max-lg:max-w-none">
          <p lang="hi" className="reveal-up text-[clamp(20px,2.6svh,24px)] text-gold" style={delay(0.1)}>
            यात्रा, बिना झंझट
          </p>
          <h1 className="mt-2 text-[clamp(52px,min(8vw,12.5svh),136px)] leading-[0.95]">
            <span className="reveal-line">
              <span style={delay(0.2)}>India,</span>
            </span>{' '}
            <span className="reveal-line">
              <span style={delay(0.35)}>
                <em className="font-hindi italic">unhurried.</em>
              </span>
            </span>
          </h1>
          <p className="reveal-up mt-[clamp(14px,2.5svh,24px)] max-w-[40ch] text-[clamp(17px,2.3svh,20px)] text-ink-soft" style={delay(0.55)}>
            Tell us where you're headed and how you like to travel. TripWise shapes every day — routes, food, stays and
            costs — around you.
          </p>

          <form onSubmit={handleSubmit} className="reveal-up glass mt-[clamp(18px,3.5svh,32px)] flex max-w-xl items-center gap-2 rounded-[22px] p-2" style={delay(0.7)}>
            <label htmlFor="hero-destination" className="sr-only">
              Where do you want to go?
            </label>
            <input
              id="hero-destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Where does your heart want to go?"
              className="h-12 min-w-0 flex-1 bg-transparent px-3 text-lg font-medium text-ink outline-none placeholder:text-ink-soft"
            />
            {/* Icon-only on small phones so the field keeps its room; the label stays for screen readers. */}
            <Button type="submit" size="lg" className="h-12 px-4 sm:px-6" icon={<ArrowRight className="size-4" aria-hidden />}>
              <span className="max-sm:sr-only">Plan my journey</span>
            </Button>
          </form>

          <div className="reveal-up mt-4 flex flex-wrap items-center gap-2" style={delay(0.85)} role="group" aria-label="Popular picks">
            {QUICK_PICKS.map((pick) => (
              <Chip key={pick} selected={destination === pick} onSelectedChange={(on) => setDestination(on ? pick : '')}>
                {pick}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <ArrivalPanel places={HERO_PLACES} index={stop.index} previous={stop.previous} onSelect={goTo} slideSeconds={reduceMotion ? null : SLIDE_SECONDS} />
    </section>
  );
}
