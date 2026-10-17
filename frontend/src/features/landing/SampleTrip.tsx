/**
 * SampleTrip.tsx — shows what the planner produces: a glass itinerary sheet
 * (three days in Udaipur, with costs) floating over its own band of liquid colour.
 * The sample is fixed content, so it never waits for the API or the AI.
 */
import { Link } from 'react-router';
import { LiquidCanvas } from '@/components/signature/LiquidCanvas';
import { useReveal } from '@/components/signature/useReveal';
import { buttonClasses } from '@/components/ui/Button';
import { delay } from './delay';

/** The three sample days: title, details, rough cost for two. */
const DAYS = [
  { title: 'City Palace and Lake Pichola', detail: 'Sunset boat ride, dinner by Ambrai ghat', cost: '₹4,200' },
  { title: 'Old city lanes and Bagore ki Haveli', detail: 'Morning walk, evening folk dance show', cost: '₹3,600' },
  { title: 'Sajjangarh at dawn', detail: 'Monsoon Palace views, brunch by Fateh Sagar', cost: '₹3,100' },
];

export function SampleTrip() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section ref={reveal} aria-labelledby="sample-title" className="mx-auto max-w-6xl px-3 py-10 sm:px-5">
      <div className="relative isolate grid items-center gap-10 overflow-hidden rounded-[40px] px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-16">
        <LiquidCanvas className="-z-10" />
        <div>
          <p lang="hi" className="reveal-up text-2xl text-gold">
            नमूना यात्रा
          </p>
          <h2 id="sample-title" className="reveal-up mt-3 text-[clamp(40px,5vw,72px)]" style={delay(0.1)}>
            Three days in Udaipur, planned in seconds.
          </h2>
          <p className="reveal-up mt-5 max-w-[40ch] text-lg text-ink-soft" style={delay(0.2)}>
            This is what you get: every day thought through, with honest costs you can plan around.
          </p>
          <Link to="/plan?destination=Udaipur" className={buttonClasses({ size: 'lg', className: 'reveal-up mt-8' })} style={delay(0.3)}>
            Plan one like this
          </Link>
        </div>

        <article aria-label="Sample itinerary for Udaipur" className="reveal-up glass-strong rounded-card p-6 sm:p-8" style={delay(0.25)}>
          <header className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
            <h3 className="text-[32px]">Udaipur</h3>
            <span className="text-[15px] text-ink-soft">3 days · 2 travellers</span>
          </header>
          <ol className="mt-2">
            {DAYS.map((day, i) => (
              <li key={day.title} className="grid grid-cols-[64px_1fr_auto] items-baseline gap-3 border-b border-dashed border-line py-4">
                <span className="font-display text-[22px] text-gold">Day {i + 1}</span>
                <span>
                  <strong className="block font-semibold">{day.title}</strong>
                  <span className="text-[15px] text-ink-soft">{day.detail}</span>
                </span>
                <span className="text-[15px] font-semibold">{day.cost}</span>
              </li>
            ))}
          </ol>
          <footer className="mt-5 flex items-center justify-between">
            <span>Estimated total</span>
            <strong className="font-display text-3xl font-normal">₹10,900</strong>
          </footer>
        </article>
      </div>
    </section>
  );
}
