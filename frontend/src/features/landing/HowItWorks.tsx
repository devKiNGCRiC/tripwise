/**
 * HowItWorks.tsx — three glass steps strung along a gold thread that draws itself
 * across the row when the section scrolls into view (desktop). Kept as a real
 * ordered list, labelled for screen readers.
 */
import { useReveal } from '@/components/signature/useReveal';
import { delay } from './delay';
import { SectionStop } from './SectionStop';

const STEPS = [
  { title: 'Choose your pace', body: "Where, when, budget, who's coming, and how slow or packed you like your days." },
  { title: 'Watch it take shape', body: 'Morning to night for every day, with travel times, local food and honest costs.' },
  { title: 'Share and set off', body: 'Send it to your crew, download the PDF, and keep it handy on the road.' },
];

export function HowItWorks() {
  const reveal = useReveal<HTMLElement>();

  return (
    <section ref={reveal} aria-labelledby="how-title" data-stop="How it works" className="page-wrap py-28 md:py-36">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionStop n="03" label="How it works" className="reveal-up mb-4" />
          <h2 id="how-title" className="reveal-up max-w-[12ch] text-[clamp(40px,min(6vw,10svh),88px)]">
            Three steps, one calm plan
          </h2>
        </div>
        <p className="reveal-up max-w-[38ch] text-ink-soft" style={delay(0.15)}>
          No forms that feel like paperwork. Answer a few questions and let the plan take shape.
        </p>
      </div>

      <div className="relative">
        {/* The gold thread (desktop): drawn in once the section is revealed */}
        <svg aria-hidden viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute inset-x-0 top-10 hidden h-28 overflow-visible text-gold md:block">
          <path
            d="M20 60 C 200 -10, 300 130, 420 60 S 680 -10, 800 60 S 1060 130, 1180 60"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="transition-[stroke-dashoffset] duration-[2600ms] ease-[cubic-bezier(.6,0,.2,1)] [stroke-dasharray:1600] [stroke-dashoffset:1600] [.is-in_&]:[stroke-dashoffset:0]"
          />
        </svg>

        <ol aria-label="How TripWise works" className="relative grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="reveal-up glass rounded-card p-8" style={delay(0.2 + i * 0.15)}>
              <p aria-hidden className="font-display text-6xl leading-none text-gold">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-5 text-[34px]">{step.title}</h3>
              <p className="mt-3 text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
