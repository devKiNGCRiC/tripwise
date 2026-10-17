/**
 * SampleTrip.tsx — shows what the planner produces, the way a traveller reads a plan:
 * a route header (DEL → UDR, dates, travellers), then each day as a timeline of timed
 * stops with the transfer between them ("12 min by auto"), and a cost per day.
 * The sheet floats on glass over its own band of liquid colour.
 * The sample is fixed content, so it never waits for the API or the AI.
 */
import { CarTaxiFront, Footprints, Plane, Sailboat, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { LiquidCanvas } from '@/components/signature/LiquidCanvas';
import { useReveal } from '@/components/signature/useReveal';
import { buttonClasses } from '@/components/ui/Button';
import { delay } from './delay';
import { SectionStop } from './SectionStop';

/** One timed stop in a day, and how you get to the next one. */
interface Slot {
  time: string;
  title: string;
  /** Transfer to the NEXT stop (omitted on the day's last stop). */
  transfer?: { icon: LucideIcon; text: string };
}

/** The three sample days: date, cost for two, and the timed stops. */
const DAYS: { date: string; cost: string; slots: Slot[] }[] = [
  {
    date: 'Fri 12 Dec',
    cost: '₹4,200',
    slots: [
      { time: '09:30', title: 'City Palace', transfer: { icon: Footprints, text: '8 min walk' } },
      { time: '17:15', title: 'Sunset boat on Lake Pichola' },
    ],
  },
  {
    date: 'Sat 13 Dec',
    cost: '₹3,600',
    slots: [
      { time: '08:00', title: 'Old city lanes and chai', transfer: { icon: CarTaxiFront, text: '12 min by auto' } },
      { time: '19:00', title: 'Folk dance at Bagore ki Haveli' },
    ],
  },
  {
    date: 'Sun 14 Dec',
    cost: '₹3,100',
    slots: [
      { time: '06:15', title: 'Sajjangarh at dawn', transfer: { icon: Sailboat, text: 'Boat across Fateh Sagar' } },
      { time: '10:30', title: 'Brunch by the lake' },
    ],
  },
];

export function SampleTrip() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section ref={reveal} aria-labelledby="sample-title" data-stop="Sample trip" className="page-wrap py-10 max-sm:px-3">
      <div className="relative isolate grid items-center gap-10 overflow-hidden rounded-[40px] px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[0.85fr_1.15fr] lg:px-16">
        <LiquidCanvas className="-z-10" />
        <div>
          <SectionStop n="04" label="Sample trip" className="reveal-up" />
          <p lang="hi" className="reveal-up mt-5 text-2xl text-gold">
            नमूना यात्रा
          </p>
          <h2 id="sample-title" className="reveal-up mt-2 text-[clamp(36px,min(4.4vw,7.5svh),66px)]" style={delay(0.1)}>
            Three days in Udaipur, planned in seconds.
          </h2>
          <p className="reveal-up mt-5 max-w-[40ch] text-lg text-ink-soft" style={delay(0.2)}>
            Every day timed and routed — what to see, when to go, how to get there and what it costs.
          </p>
          <Link to="/plan?destination=Udaipur" className={buttonClasses({ size: 'lg', className: 'reveal-up mt-8' })} style={delay(0.3)}>
            Plan one like this
          </Link>
        </div>

        <article aria-label="Sample itinerary for Udaipur" className="reveal-up glass-strong rounded-card p-6 sm:p-8" style={delay(0.25)}>
          {/* Route header, like the top of a ticket */}
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="flex items-center gap-3 font-display text-3xl">
                DEL <Plane aria-label="to" className="size-5 text-gold" /> UDR
              </p>
              <h3 className="mt-1 font-body text-[15px] text-ink-soft">Udaipur · City of Lakes</h3>
            </div>
            <p className="text-right text-[15px] text-ink-soft">
              12 – 14 Dec
              <br />2 travellers
            </p>
          </header>

          <ol className="mt-2">
            {DAYS.map((day, i) => (
              <li key={day.date} className="border-b border-dashed border-line py-4 last:border-b-0">
                <p className="flex items-baseline justify-between">
                  <span>
                    <span className="font-display text-xl text-gold">Day {i + 1}</span>
                    <span className="ml-3 text-[13px] tracking-[0.14em] text-ink-soft uppercase">{day.date}</span>
                  </span>
                  <span className="text-[15px] font-semibold">{day.cost}</span>
                </p>
                {/* The day's timeline */}
                <ol className="mt-2 ml-1 border-l border-gold/40 pl-4">
                  {day.slots.map((slot) => (
                    <li key={slot.time} className="relative">
                      <span aria-hidden className="absolute top-2 -left-[21px] size-2 rounded-full bg-gold" />
                      <p className="flex gap-3">
                        <span className="w-12 shrink-0 font-semibold tabular-nums">{slot.time}</span>
                        <span>{slot.title}</span>
                      </p>
                      {slot.transfer && (
                        <p className="my-1 ml-15 flex items-center gap-1.5 text-[13px] text-ink-soft">
                          <slot.transfer.icon aria-hidden className="size-3.5" />
                          {slot.transfer.text}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>

          <footer className="mt-3 flex items-center justify-between border-t border-line pt-4">
            <span>Estimated total for two</span>
            <strong className="font-display text-3xl font-normal">₹10,900</strong>
          </footer>
        </article>
      </div>
    </section>
  );
}
