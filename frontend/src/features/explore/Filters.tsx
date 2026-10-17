/**
 * Filters.tsx — Explore's filter bar on glass: search, then pill rows for world (the seven
 * regions, or beyond India), vibe and budget, plus a best-month picker. Filters live in the
 * URL (ExplorePage), so a filtered view can be shared and the back button works; this
 * component only shows the values and reports changes.
 */
import { Search, X } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import type { BudgetTier, Vibe } from '@/lib/api/types';
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
/** Small caps label above each row. */
const LABEL = 'mb-2 text-xs font-bold tracking-[0.14em] text-soft uppercase';

/** One labelled row of single-choice pills (click the chosen one again to clear it). */
function PillRow({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p aria-hidden className={LABEL}>
        {label}
      </p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(([key, text]) => (
          <Chip key={key} selected={value === key} onSelectedChange={(on) => onChange(on ? key : '')}>
            {text}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/** The filter bar. */
export function Filters({ value, onChange }: { value: ExploreFilters; onChange: (next: Partial<ExploreFilters>) => void }) {
  const active = Object.values(value).some(Boolean);

  return (
    <div className="glass-strong grid gap-5 rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
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
        <label className="flex items-center gap-2 rounded-2xl border border-line bg-glass px-4">
          <span className="text-xs font-bold tracking-[0.14em] text-soft uppercase">Best in</span>
          <select aria-label="Best month" value={value.month} onChange={(event) => onChange({ month: event.target.value })} className="h-12 bg-transparent font-semibold outline-none">
            <option value="">Any month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </label>
        {active && (
          <button type="button" onClick={() => onChange(NO_FILTERS)} className="flex h-12 items-center gap-1.5 rounded-2xl px-3 font-semibold text-soft hover:text-ink">
            <X aria-hidden className="size-4" /> Reset
          </button>
        )}
      </div>
      <PillRow
        label="World"
        options={[...REGIONS.map((r): [string, string] => [r.key, r.name]), ['abroad', 'Beyond India']]}
        value={value.world}
        onChange={(world) => onChange({ world })}
      />
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <PillRow label="Vibe" options={VIBES.map((v): [string, string] => [v, v[0].toUpperCase() + v.slice(1)])} value={value.vibe} onChange={(vibe) => onChange({ vibe })} />
        <PillRow label="Budget" options={BUDGETS} value={value.budget} onChange={(budget) => onChange({ budget })} />
      </div>
    </div>
  );
}
