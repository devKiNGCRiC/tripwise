/**
 * CrewTeaser.tsx — previews Crew mode (coming after the traveller features):
 * plan together, split costs fairly, keep notes and photos in one place.
 * The glass "crew card" on the right is a static illustration of the feature.
 */
import { useReveal } from '@/components/signature/useReveal';
import { Tag } from '@/components/ui/Chip';
import { delay } from './delay';
import { SectionStop } from './SectionStop';

/** Crew members in the illustration: initial + avatar tint. */
const CREW = [
  { name: 'Riya', tint: 'bg-[#e6b765]' },
  { name: 'Arjun', tint: 'bg-[#6fd3d0]' },
  { name: 'Kabir', tint: 'bg-[#f29e40]' },
  { name: 'Meera', tint: 'bg-[#8cc7c2]' },
];
/** Shared expenses in the illustration. */
const EXPENSES = [
  { who: 'Riya', what: 'Scooters for the day', amount: '₹2,400' },
  { who: 'Arjun', what: 'Dinner at the shack', amount: '₹1,800' },
  { who: 'Meera', what: 'Ferry tickets', amount: '₹640' },
];
/** Promises listed beside the card. */
const FEATURES = ['Invite friends with a link', 'Split expenses fairly, settle up in a tap', 'Shared notes, checklists and photos'];

export function CrewTeaser() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section ref={reveal} aria-labelledby="crew-title" data-stop="Crew" className="page-wrap grid items-center gap-12 py-28 md:py-36 lg:grid-cols-2">
      <div>
        <div className="reveal-up flex flex-wrap items-center gap-4">
          <SectionStop n="05" label="Crew" />
          <Tag tone="gold">Coming soon</Tag>
        </div>
        <h2 id="crew-title" className="reveal-up mt-5 text-[clamp(40px,min(6vw,10svh),84px)]" style={delay(0.1)}>
          Better with your crew
        </h2>
        <p className="reveal-up mt-5 max-w-[42ch] text-lg text-ink-soft" style={delay(0.2)}>
          Plan, share and go together. One trip, everyone's ideas, and nobody stuck doing the maths at the end.
        </p>
        <ul className="mt-8 grid gap-3">
          {FEATURES.map((feature, i) => (
            <li key={feature} className="reveal-up flex items-center gap-3" style={delay(0.3 + i * 0.1)}>
              <span aria-hidden className="size-1.5 rotate-45 bg-gold" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Illustration of a crew trip (decorative: the text beside it says it all) */}
      <div aria-hidden className="reveal-up glass relative rounded-card p-7" style={delay(0.2)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-3xl">Goa with the gang</p>
            <p className="text-[15px] text-ink-soft">4 travellers · 5 days</p>
          </div>
          <div className="flex -space-x-2">
            {CREW.map((member) => (
              <span key={member.name} className={`grid size-10 place-items-center rounded-full border-2 border-paper font-semibold text-[#1c1814] ${member.tint}`}>
                {member.name[0]}
              </span>
            ))}
          </div>
        </div>
        <ul className="mt-6 grid gap-1">
          {EXPENSES.map((expense) => (
            <li key={expense.what} className="flex items-baseline justify-between gap-3 border-b border-dashed border-line py-3">
              <span>
                <strong className="font-semibold">{expense.who}</strong> <span className="text-ink-soft">paid for {expense.what.toLowerCase()}</span>
              </span>
              <span className="font-semibold">{expense.amount}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-2xl bg-cta px-4 py-3 text-on-cta">You owe Riya ₹600 — settle up?</p>
      </div>
    </section>
  );
}
