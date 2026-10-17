/**
 * TravellerKinds.tsx — "However you travel, it bends to you": one card per kind of
 * traveller. The chosen card widens (on wide screens), fills with the region colour and
 * lists what TripWise changes for that traveller. Shares its choice with the hero chips
 * and the planner's "Who's going".
 */
import { useReveal } from '@/components/signature/useReveal';
import { cn } from '@/lib/utils/cn';
import { KINDS } from './kinds';

/** Line icons for each kind (24×24 strokes). */
const ICONS: Record<string, string> = {
  Solo: 'M12 3.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM5 21c0-4 3-7 7-7s7 3 7 7',
  Friends: 'M8 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM16 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM2 20c0-3.5 2.7-6 6-6s6 2.5 6 6M10 20c0-3.5 2.7-6 6-6s6 2.5 6 6',
  Backpackers: 'M7 8V6a5 5 0 0 1 10 0v2M5 11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM9 14h6',
  Family: 'M7 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM17 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 11a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM2 21c0-3 2-6 5-6M22 21c0-3-2-6-5-6M9 21c0-2 1.3-4 3-4s3 2 3 4',
  Couples: 'M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z',
};

export function TravellerKinds({ who, onWhoChange }: { who: string; onWhoChange: (who: string) => void }) {
  const reveal = useReveal<HTMLElement>();
  const columns = KINDS.map((kind) => (kind.who === who ? '1.6fr' : '1fr')).join(' ');

  return (
    <section ref={reveal} aria-labelledby="kinds-title" className="page-wrap py-[clamp(60px,10vh,120px)]">
      <div className="reveal-up glass rounded-[36px] p-[clamp(22px,3.4vw,48px)]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <h2 id="kinds-title" className="max-w-[15ch] text-[clamp(34px,4.6vw,70px)]">
            However you travel, <em>it bends to you.</em>
          </h2>
          <p className="max-w-[42ch] text-soft">Pick how you're travelling — the plan changes its pace, budget and stays to fit. Tap a card to see what changes.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-(--kinds) lg:transition-[grid-template-columns] lg:duration-500" style={{ '--kinds': columns } as React.CSSProperties}>
          {KINDS.map((kind) => {
            const on = kind.who === who;
            return (
              <button
                key={kind.title}
                type="button"
                aria-pressed={on}
                onClick={() => onWhoChange(kind.who)}
                className={cn(
                  'flex min-h-[240px] flex-col gap-2.5 overflow-hidden rounded-3xl border p-5 text-left transition-colors duration-300',
                  on ? 'border-transparent bg-accent text-on-accent' : 'border-line bg-ink/4 hover:bg-ink/7',
                )}
              >
                <span aria-hidden className="grid size-11 place-items-center rounded-2xl bg-current/12">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[kind.title]} />
                  </svg>
                </span>
                <h3 className="text-[26px]">{kind.title}</h3>
                <p className="text-sm opacity-85">{kind.line}</p>
                <ul className={cn('mt-auto grid gap-1.5 text-[13.5px] font-semibold transition-[opacity,max-height] duration-500', on ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0')}>
                  {kind.perks.map((perk) => (
                    <li key={perk}>✓ {perk}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
