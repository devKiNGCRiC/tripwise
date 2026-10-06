/**
 * CrewTeaser.tsx — Stage 5, the River: a preview of the upcoming crew features
 * (invite friends, split expenses, shared notes and photos).
 */
import { DescentStage, GlassPanel } from './DescentStage';

const FEATURES = [
  { icon: '🔗', title: 'Invite the gang', text: "One WhatsApp link and everyone's in the trip." },
  { icon: '💸', title: 'Split expenses', text: 'Who paid what and who owes whom. Settle up by UPI.' },
  { icon: '📸', title: 'Notes and photos', text: 'PNRs, bookings and memories, all in one place.' },
];

export function CrewTeaser() {
  return (
    <DescentStage name="River" side="right">
      <GlassPanel>
        <p className="font-semibold text-orange">Coming soon</p>
        <h2 className="mt-1 text-[clamp(32px,4.2vw,56px)] font-stretch-122%">Better with your crew</h2>
        <p className="mt-3 text-lg text-ink-soft">Plan together, split costs fairly, and keep the whole trip in one place.</p>
        <ul className="mt-7 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border border-line/15 bg-surface/60 p-4">
              <span aria-hidden className="text-2xl">
                {f.icon}
              </span>
              <h3 className="mt-2 text-lg font-stretch-112%">{f.title}</h3>
              <p className="mt-1 text-ink-soft">{f.text}</p>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </DescentStage>
  );
}
