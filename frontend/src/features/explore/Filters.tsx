/**
 * Filters.tsx — Explore's compact filter bar on glass. One row: search, then Vibe, Budget
 * and Best-month dropdown pills (and Reset when anything is set); a second row of world
 * chips (the seven regions, or beyond India) that scrolls sideways on small screens.
 * Kept short so the destination cards appear right away. Filters live in the URL
 * (ExplorePage); this component only shows the values and reports changes.
 */
import { ChevronDown, Search, X } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import type { BudgetTier, Vibe } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { REGIONS } from '@/world/regions';

/** All filter values (empty string = not set). */
export interface ExploreFilters {
  q: string;
  world: string;
  vibe: string;
  budget: string;
  month: string;
}

/** Every filter cleared. */
export const NO_FILTERS: ExploreFilters = { q: '', world: '', vibe: '', budget: '', month: '' };

/** Vibes travellers can filter by. */
const VIBES: Vibe[] = ['beach', 'mountains', 'culture', 'food', 'nature', 'adventure', 'spiritual', 'city', 'romantic', 'party'];
/** Budget tiers and how they read. */
const BUDGETS: [BudgetTier, string][] = [
  ['budget', 'Budget'],
  ['mid', 'Mid-range'],
  ['luxury', 'Luxury'],
];
/** Short month names, January first. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A dropdown styled as a pill; filled with ink when a value is chosen. */
function PillSelect({ label, value, any, options, onChange }: { label: string; value: string; any: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <label className={cn('relative flex h-12 items-center rounded-2xl border pr-9 pl-4 transition-colors', value ? 'border-transparent bg-ink text-on-ink' : 'border-line bg-glass')}>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="appearance-none bg-transparent font-semibold outline-none [&>option]:text-[#121417]">
        <option value="">{any}</option>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 size-4 opacity-70" />
    </label>
  );
}

/** The filter bar. */
export function Filters({ value, onChange }: { value: ExploreFilters; onChange: (next: Partial<ExploreFilters>) => void }) {
  const active = Object.values(value).some(Boolean);

  return (
    <div role="search" aria-label="Filter destinations" className="glass-strong grid gap-3 rounded-[28px] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-[min(100%,260px)] flex-1 items-center gap-2 rounded-2xl border border-line bg-glass px-4">
          <Search aria-hidden className="size-4 text-soft" />
          <input
            type="search"
            aria-label="Search destinations"
            value={value.q}
            onChange={(event) => onChange({ q: event.target.value })}
            placeholder="Search a place or country…"
            className="h-12 min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-soft"
          />
        </label>
        <PillSelect label="Vibe" any="Any vibe" value={value.vibe} options={VIBES.map((v): [string, string] => [v, v[0].toUpperCase() + v.slice(1)])} onChange={(vibe) => onChange({ vibe })} />
        <PillSelect label="Budget" any="Any budget" value={value.budget} options={BUDGETS} onChange={(budget) => onChange({ budget })} />
        <PillSelect label="Best month" any="Any month" value={value.month} options={MONTHS.map((m, i): [string, string] => [String(i + 1), `Best in ${m}`])} onChange={(month) => onChange({ month })} />
        {active && (
          <button type="button" onClick={() => onChange(NO_FILTERS)} className="flex h-12 items-center gap-1.5 rounded-2xl px-3 font-semibold text-soft hover:text-ink">
            <X aria-hidden className="size-4" /> Reset
          </button>
        )}
      </div>
      <div role="group" aria-label="World" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
        {[...REGIONS.map((r): [string, string] => [r.key, r.name]), ['abroad', 'Beyond India']].map(([key, text]) => (
          <Chip key={key} className="shrink-0" selected={value.world === key} onSelectedChange={(on) => onChange({ world: on ? key : '' })}>
            {text}
          </Chip>
        ))}
      </div>
    </div>
  );
}
