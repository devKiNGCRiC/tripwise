/**
 * Hero.tsx — the first screen, where the two halves of Monsoon Editorial meet:
 * full-screen cinematic photographs of India (Rangoli Editorial) that behave like
 * water — they shimmer, ripple under your pointer and pour into one another
 * (Liquid Monsoon). Day grades them in warm dawn light; Night turns them monsoon
 * indigo with rain and a lantern glow that follows the pointer.
 *
 * On top: the editorial headline ("India, unhurried."), the Hindi line, the glass
 * quick-plan box (hands off to the planner, through login for guests), quick picks,
 * a gold rangoli drawn over the photo, and a slide index to visit each place.
 */
import { ArrowRight } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { PhotoLiquid } from '@/components/signature/PhotoLiquid';
import { Rangoli } from '@/components/signature/Rangoli';
import { useReveal } from '@/components/signature/useReveal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils/cn';
import { sizedImage } from '@/lib/utils/images';
import { delay } from './delay';

/** The places the hero visits: English + Hindi names, a line, and an Unsplash photo. */
export const HERO_PLACES = [
  { name: 'Varanasi', local: 'वाराणसी', line: 'Dawn boats on the Ganga', photo: '1571536802807-30451e3955d8' },
  { name: 'Jaipur', local: 'जयपुर', line: 'Palaces in pink sandstone', photo: '1477587458883-47145ed94245' },
  { name: 'Kerala', local: 'केरल', line: 'Backwaters at an easy pace', photo: '1602216056096-3b40cc0c9944' },
  { name: 'Ladakh', local: 'लद्दाख', line: 'Roads to the roof of the world', photo: '1581793745862-99fde7fa73d2' },
];
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
  const [index, setIndex] = useState(0);
  const [urls] = useState(photoUrls);
  const reduceMotion = usePrefersReducedMotion();
  const reveal = useReveal<HTMLElement>();
  const place = HERO_PLACES[index];

  // Auto-advance (restarts whenever the place changes, so a click gets a full turn).
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % HERO_PLACES.length), SLIDE_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [index, reduceMotion]);

  /** Go to the planner, pre-filling the destination if one was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = destination.trim();
    navigate(trimmed ? `/plan?destination=${encodeURIComponent(trimmed)}` : '/plan');
  }

  return (
    <section ref={reveal} className="relative isolate flex min-h-svh items-end overflow-hidden lg:items-center">
      {/* Phones: the photo fills the top of the screen only, so its subject stays in frame */}
      <PhotoLiquid urls={urls} index={index} className="-z-20 max-lg:bottom-auto max-lg:h-[62svh]" />
      {/* Night: fine monsoon rain over the photo */}
      <div aria-hidden className="rain pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-1000 dark:opacity-100" />
      {/* The photo melts into the page where the words sit: from the left on desktop, from below on phones */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-paper from-55% via-paper/60 via-62% to-paper/0 to-70% lg:bg-linear-to-r lg:from-paper lg:from-22% lg:via-paper/70 lg:via-45% lg:to-paper/0 lg:to-72%"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-28 bg-linear-to-b from-transparent to-paper" />
      {/* A gold rangoli drawn over the photograph (desktop) */}
      <Rangoli className="pointer-events-none absolute top-1/2 right-[6%] -z-10 hidden w-[min(440px,32vw)] -translate-y-1/2 text-[#e6b765] opacity-75 lg:block" />

      {/* Phones: the photo gets the top of the screen, the words start below it */}
      <div className="relative mx-auto w-full max-w-6xl px-5 pt-[46svh] pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-[640px]">
          <p lang="hi" className="reveal-up text-2xl text-gold" style={delay(0.1)}>
            यात्रा, बिना झंझट
          </p>
          <h1 className="mt-3 text-[clamp(56px,8.5vw,140px)] leading-[0.95]">
            <span className="reveal-line">
              <span style={delay(0.2)}>India,</span>
            </span>{' '}
            <span className="reveal-line">
              <span style={delay(0.35)}>
                <em className="font-hindi italic">unhurried.</em>
              </span>
            </span>
          </h1>
          <p className="reveal-up mt-6 max-w-[40ch] text-xl text-ink-soft" style={delay(0.55)}>
            Tell us where you're headed and how you like to travel. TripWise shapes every day — routes, food, stays and
            costs — around you.
          </p>

          <form onSubmit={handleSubmit} className="reveal-up glass mt-8 flex max-w-xl items-center gap-2 rounded-[22px] p-2" style={delay(0.7)}>
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

      {/* The place on screen + the slide index (top-right on phones, bottom-right on desktop) */}
      <div className="absolute top-24 right-5 flex flex-col items-end text-right text-[#f6efe3] [text-shadow:0_2px_18px_rgb(0_0_0/.45)] lg:top-auto lg:right-[max(20px,calc((100vw-72rem)/2+20px))] lg:bottom-10">
        <p key={place.name} lang="hi" aria-live="polite" className="animate-fade-in text-4xl opacity-0 lg:text-5xl">
          {place.local}
        </p>
        <p className="mt-1 text-sm tracking-[0.18em] uppercase opacity-90 max-lg:hidden">
          {place.name} · {place.line}
        </p>
        <div role="group" aria-label="Choose a place" className="mt-4 flex gap-4">
          {HERO_PLACES.map((p, i) => (
            <button
              key={p.name}
              type="button"
              aria-label={`Show ${p.name}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                'flex w-12 flex-col items-start gap-1.5 text-left text-xs font-medium transition-opacity lg:w-20',
                i === index ? 'opacity-100' : 'opacity-60 hover:opacity-100',
              )}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <span className="relative block h-px w-full overflow-hidden bg-white/35">
                {i === index && (
                  <span
                    className={cn('absolute inset-0 origin-left bg-[#e6b765]', !reduceMotion && 'animate-[slide-progress_linear_forwards]')}
                    style={{ animationDuration: `${SLIDE_SECONDS}s` }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
