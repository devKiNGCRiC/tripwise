/**
 * Hero.tsx — the first screen.
 *
 * Left:  the railway departure board cycling through destinations, the headline,
 *        and a quick "where to?" box that hands off to the planner.
 * Right: the 3D globe with flight routes, with two floating notes that show what
 *        TripWise produces (a trip price, a passport stamp).
 * Behind: the kite-festival sky (sky lanterns at night).
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { DepartureBoard, type BoardStop } from '@/components/signature/DepartureBoard';
import { FestivalSky } from '@/components/signature/FestivalSky';
import { Globe } from '@/components/signature/Globe';

/** Destinations on the board (fixed, so it never waits for the API). */
const BOARD_STOPS: BoardStop[] = [
  { name: 'Goa', localName: 'गोवा' },
  { name: 'Manali', localName: 'मनाली' },
  { name: 'Jaipur', localName: 'जयपुर' },
  { name: 'Ladakh', localName: 'लद्दाख' },
  { name: 'Varanasi', localName: 'वाराणसी' },
  { name: 'Bali', localName: 'बाली' },
];

export function Hero() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');

  /** Go to the planner, pre-filling the destination if one was typed. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = destination.trim();
    navigate(trimmed ? `/plan?destination=${encodeURIComponent(trimmed)}` : '/plan');
  }

  return (
    <section className="sky-fill relative overflow-hidden">
      <FestivalSky />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-6 px-4 pt-14 pb-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <DepartureBoard stops={BOARD_STOPS} className="mt-8" />

          <h1 className="mt-9 max-w-[18ch] text-[clamp(32px,3.6vw,48px)] leading-[1.05] font-extrabold [font-stretch:112%]">
            Your whole trip, planned day by day in seconds.
          </h1>

          <form onSubmit={handleSubmit} className="mt-7 flex max-w-xl flex-wrap gap-3">
            <label htmlFor="hero-destination" className="sr-only">
              Where do you want to go?
            </label>
            <input
              id="hero-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Goa, Ladakh, Bali…"
              className="h-[58px] min-w-56 flex-1 rounded-[14px] border-[2.5px] border-black bg-white px-5 text-lg text-black shadow-pop outline-none placeholder:text-neutral-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
            />
            <Button type="submit" size="lg">
              Plan my trip
            </Button>
          </form>
          <p className="mt-4 max-w-xl text-base text-ink-soft">
            Free forever. Five AI-planned trips a day, a PDF to download, and a link to share with your gang.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <Globe />
          {/* Floating notes: a peek at what you'll get */}
          <div aria-hidden className="absolute top-[10%] left-0 rounded-xl border-[2.5px] border-black bg-white px-3 py-2 leading-tight text-black shadow-[4px_4px_0_#000]">
            <span className="block font-display text-lg font-extrabold [font-stretch:120%]">₹12,000</span>
            <span className="text-[15px] font-semibold">Goa, 3 days for 2</span>
          </div>
          <div aria-hidden className="absolute right-0 bottom-[12%] rotate-2 rounded-xl border-[2.5px] border-black bg-green px-3 py-2 leading-tight text-black shadow-[4px_4px_0_#000]">
            <span className="block font-display text-lg font-extrabold [font-stretch:120%]">Saved!</span>
            <span className="text-[15px] font-semibold">Stamp added to your passport</span>
          </div>
        </div>
      </div>
    </section>
  );
}
