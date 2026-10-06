/**
 * Hero.tsx — first screen of the landing page.
 * Left: headline + the quick "Where to?" box (hands off to /plan?destination=…).
 * Right: a floating sample boarding pass with stamps — shows the product at a glance.
 */
import { ArrowRight, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Stamp } from '@/components/ui/Stamp';
import { Ticket } from '@/components/ui/Ticket';

/** Three sample day lines on the hero ticket. */
const SAMPLE_DAYS = [
  { day: 'DAY 1', text: 'Fontainhas walk → sunset at Vagator' },
  { day: 'DAY 2', text: 'Dudhsagar Falls → spice farm lunch' },
  { day: 'DAY 3', text: 'Palolem kayaking → night market' },
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
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 md:grid-cols-[1.1fr_0.9fr] md:pt-16">
      <div>
        <Stamp tone="danger" rotate={-4}>
          AI travel planner · Free
        </Stamp>
        <h1 className="mt-6 text-5xl leading-[0.95] font-extrabold sm:text-6xl lg:text-7xl">
          Plan less.
          <br />
          Wander <span className="relative inline-block text-orange">more.</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg text-ink-soft">
          Tell us where, when and your vibe. TripWise builds a day-by-day itinerary that fits your budget — in seconds.
        </p>

        {/* Quick start: one field, one button. Full details come in the planner. */}
        <form onSubmit={handleSubmit} className="mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
          <label htmlFor="hero-destination" className="sr-only">
            Where to?
          </label>
          <div className="flex h-14 flex-1 items-center gap-2 rounded-full border-2 border-line bg-surface px-5 shadow-pop focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-sky-deep">
            <MapPin className="size-5 shrink-0 text-orange" aria-hidden />
            <input
              id="hero-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Where to? Goa, Bali, Tokyo…"
              className="h-full w-full bg-transparent text-base outline-none placeholder:text-ink-soft/70"
            />
          </div>
          <Button type="submit" size="lg" icon={<ArrowRight className="size-5" aria-hidden />}>
            Plan my trip
          </Button>
        </form>
        <p className="mt-4 text-xs tracking-wide text-ink-soft">NO CARD · 5 AI TRIPS A DAY · PDF + SHARE</p>
      </div>

      {/* Decorative sample ticket — gently floats (motion respects reduced-motion). */}
      <motion.div
        aria-hidden
        className="relative mx-auto w-full max-w-sm"
        initial={{ opacity: 0, y: 24, rotate: 4 }}
        animate={{ opacity: 1, y: [0, -8, 0], rotate: 3 }}
        transition={{ opacity: { duration: 0.5 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
      >
        <Ticket
          stub={
            <>
              <span className=" text-xs font-bold tracking-widest">TW-GOI · 3D</span>
              <span className=" text-sm font-bold">₹12,000</span>
            </>
          }
        >
          <div className="flex items-center justify-between">
            <span className=" text-xs font-bold tracking-[0.2em] text-ink-soft">BOARDING PASS</span>
            <span className="rounded-full bg-green-deep px-2.5 py-0.5 text-[10px] font-bold text-white">AI PLANNED</span>
          </div>
          <p className="mt-3 font-display text-4xl font-extrabold">Goa</p>
          <p className="text-sm text-ink-soft">Friends · Balanced pace · Beaches & food</p>
          <ul className="mt-4 space-y-2">
            {SAMPLE_DAYS.map((d) => (
              <li key={d.day} className="flex gap-3 text-sm">
                <span className=" text-xs font-bold text-orange">{d.day}</span>
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
        </Ticket>
        <Stamp tone="violet" rotate={-14} className="absolute -top-5 -left-6 bg-paper">
          Bali ✓
        </Stamp>
        <Stamp tone="teal" rotate={10} className="absolute -right-4 -bottom-6 bg-paper">
          Tokyo ✓
        </Stamp>
      </motion.div>
    </section>
  );
}
