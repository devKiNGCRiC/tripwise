/**
 * Hero.tsx — the first screen: living liquid colour behind an editorial headline
 * ("India, unhurried."), the Hindi line, a self-drawing rangoli, and the quick
 * "where to?" box that hands off to the planner (through login for guests).
 * Quick-pick chips fill the box with a popular destination.
 */
import { ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { LiquidCanvas } from '@/components/signature/LiquidCanvas';
import { Rangoli } from '@/components/signature/Rangoli';
import { useReveal } from '@/components/signature/useReveal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { delay } from './delay';

/** Popular places offered as one-tap picks (fixed, so the hero never waits for the API). */
const QUICK_PICKS = ['Goa', 'Jaipur', 'Ladakh', 'Kerala', 'Varanasi'];

export function Hero() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const reveal = useReveal<HTMLElement>();

  /** Go to the planner, pre-filling the destination if one was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = destination.trim();
    navigate(trimmed ? `/plan?destination=${encodeURIComponent(trimmed)}` : '/plan');
  }

  return (
    <section ref={reveal} className="relative isolate flex min-h-svh items-center overflow-hidden">
      <LiquidCanvas />
      {/* Melt the liquid into the page colour at the bottom edge */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-paper transition-colors duration-900" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pt-32 pb-24 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0">
          <p lang="hi" className="reveal-up text-2xl text-gold" style={delay(0.1)}>
            यात्रा, बिना झंझट
          </p>
          <h1 className="mt-3 text-[clamp(60px,9vw,148px)] leading-[0.95]">
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
            {QUICK_PICKS.map((place) => (
              <Chip key={place} selected={destination === place} onSelectedChange={(on) => setDestination(on ? place : '')}>
                {place}
              </Chip>
            ))}
          </div>
        </div>

        {/* The rangoli: beside the text on desktop, a faint watermark behind it on phones */}
        <Rangoli className="pointer-events-none absolute -top-6 -right-1/3 -z-10 w-[110%] opacity-25 lg:static lg:z-auto lg:w-full lg:max-w-[520px] lg:justify-self-end lg:opacity-100" />
      </div>

      <div aria-hidden className="absolute right-[max(20px,calc((100vw-72rem)/2+20px))] bottom-8 hidden flex-col items-center gap-2 text-sm text-ink-soft lg:flex">
        Scroll
        <span className="h-11 w-px origin-top animate-pulse bg-linear-to-b from-gold to-transparent" />
      </div>
    </section>
  );
}
