/**
 * NamesToggle.tsx — ways to choose Indian or English names:
 *   NamesToggle  a small "English names" switch (on the Toli page)
 *   NamesChoice  the two choices side by side (in the account's preferences)
 */
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWords } from './WordsProvider';
import type { NameStyle } from './words';

/** The "English names" switch. */
export function NamesToggle({ className }: { className?: string }) {
  const { english, setStyle } = useWords();
  return (
    <button
      type="button"
      aria-pressed={english}
      onClick={() => setStyle(english ? 'indian' : 'english')}
      className={cn('inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold', english ? 'bg-ink text-on-ink' : 'hover:bg-ink/6', className)}
    >
      <Languages aria-hidden className="size-4" />
      English names
    </button>
  );
}

/** The two choices. */
const CHOICES: { style: NameStyle; title: string; example: string }[] = [
  { style: 'indian', title: 'Indian', example: 'Toli · Sahyatri · Chaupal (with English beside them)' },
  { style: 'english', title: 'English', example: 'Group · Member · Group chat' },
];

/** Indian or English names, for the account page. */
export function NamesChoice() {
  const { style, setStyle } = useWords();
  return (
    <div role="radiogroup" aria-label="Feature names" className="grid gap-2 sm:grid-cols-2">
      {CHOICES.map((c) => (
        <button
          key={c.style}
          type="button"
          role="radio"
          aria-checked={style === c.style}
          onClick={() => setStyle(c.style)}
          className={cn('grid gap-0.5 rounded-2xl border px-4 py-3 text-left', style === c.style ? 'border-accent bg-accent/10' : 'border-line hover:bg-ink/6')}
        >
          <span className="font-semibold">{c.title}</span>
          <span className="text-sm text-soft">{c.example}</span>
        </button>
      ))}
    </div>
  );
}
