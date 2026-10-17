/**
 * steps.tsx — the planner's five question steps plus the review, as small components.
 * Each receives the React Hook Form helpers it needs; validation messages come from the
 * shared schema (schema.ts) and are announced next to their fields.
 */
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { useDestinations } from '@/features/explore/hooks';
import type { Interest, Pace, Travellers } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';
import { formatMoney } from '@/lib/utils/format';
import { tripLength, type PlannerValues } from './schema';

/** Props shared by the steps. */
interface StepProps {
  register: UseFormRegister<PlannerValues>;
  errors: FieldErrors<PlannerValues>;
  values: PlannerValues;
  setValue: UseFormSetValue<PlannerValues>;
}

/** An error line under a group of controls. */
function GroupError({ message }: { message?: string }) {
  return message ? <p className="mt-2 text-sm font-medium text-danger">{message}</p> : null;
}

/** Big selectable cards for a single choice (native radios, so keyboards just work). */
function ChoiceCards<T extends string>({ name, options, register }: { name: 'travellers' | 'pace'; options: [T, string, string][]; register: StepProps['register'] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {options.map(([value, title, line]) => (
        <label
          key={value}
          className="cursor-pointer rounded-2xl border border-line bg-glass p-4 transition has-[:checked]:border-transparent has-[:checked]:bg-ink has-[:checked]:text-on-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
        >
          <input type="radio" value={value} className="sr-only" {...register(name)} />
          <span className="block font-semibold">{title}</span>
          <span className="text-sm opacity-80">{line}</span>
        </label>
      ))}
    </div>
  );
}

/** Step 1 — where to. */
export function DestinationStep({ register, errors, setValue }: StepProps) {
  const { data: destinations } = useDestinations();
  return (
    <div className="grid gap-5">
      <Input label="Destination" placeholder="Badrinath, Goa, Hampi, Tokyo…" error={errors.destination?.message} autoComplete="off" {...register('destination')} />
      {destinations && (
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.14em] text-soft uppercase">Popular right now</p>
          <div role="group" aria-label="Popular destinations" className="flex flex-wrap gap-2">
            {destinations.slice(0, 8).map((d) => (
              <Chip key={d.id} onClick={() => setValue('destination', d.name, { shouldValidate: true })}>
                {d.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Step 2 — when. */
export function DatesStep({ register, errors, values }: StepProps) {
  const days = values.startDate && values.endDate ? tripLength(values.startDate, values.endDate) : 0;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Input label="Start date" type="date" error={errors.startDate?.message} {...register('startDate')} />
      <Input label="End date" type="date" error={errors.endDate?.message} {...register('endDate')} />
      {days > 0 && days <= 14 && (
        <p className="text-soft sm:col-span-2">
          {days} {days === 1 ? 'day' : 'days'} — a lovely length.
        </p>
      )}
    </div>
  );
}

/** Who's travelling, with what each means. */
const TRAVELLERS: [Travellers, string, string][] = [
  ['solo', 'Solo', 'Just me'],
  ['couple', 'Couple', 'Two of us'],
  ['friends', 'Friends', 'A group or backpackers'],
  ['family', 'Family', 'Kids and grandparents too'],
];

/** Step 3 — budget and company. */
export function BudgetStep({ register, errors, values }: StepProps) {
  return (
    <div className="grid gap-6">
      <div className="max-w-sm">
        <Input
          label="Budget per person per day (₹)"
          type="number"
          inputMode="numeric"
          min={500}
          step={500}
          error={errors.budget?.message}
          hint={values.budget >= 500 ? `About ${formatMoney({ amount: values.budget, currency: 'INR' })} a day each` : undefined}
          {...register('budget', { valueAsNumber: true })}
        />
      </div>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-soft">Who's travelling?</legend>
        <ChoiceCards name="travellers" options={TRAVELLERS} register={register} />
      </fieldset>
    </div>
  );
}

/** Interests travellers can pick. */
const INTERESTS: [Interest, string][] = [
  ['food', 'Food'],
  ['culture', 'Culture'],
  ['history', 'History'],
  ['nature', 'Nature'],
  ['adventure', 'Adventure'],
  ['spiritual', 'Spiritual'],
  ['photography', 'Photography'],
  ['relaxation', 'Relaxation'],
  ['shopping', 'Shopping'],
  ['nightlife', 'Nightlife'],
];

/** Step 4 — interests (1–5). */
export function InterestsStep({ errors, values, setValue }: StepProps) {
  /** Add or remove one interest. */
  function toggle(interest: Interest, on: boolean) {
    const next = on ? [...values.interests, interest] : values.interests.filter((i) => i !== interest);
    setValue('interests', next, { shouldValidate: true });
  }
  return (
    <div>
      <p className="mb-3 text-soft">Pick up to five — the plan leans towards these.</p>
      <div role="group" aria-label="Interests" className="flex flex-wrap gap-2.5">
        {INTERESTS.map(([key, label]) => (
          <Chip key={key} selected={values.interests.includes(key)} onSelectedChange={(on) => toggle(key, on)} className="px-4 py-2 text-base">
            {label}
          </Chip>
        ))}
      </div>
      <GroupError message={errors.interests?.message} />
    </div>
  );
}

/** Paces and what they mean. */
const PACES: [Pace, string, string][] = [
  ['chill', 'Chill', 'Two things a day, long lunches'],
  ['balanced', 'Balanced', 'Three things a day, room to breathe'],
  ['packed', 'Packed', 'Four things a day, early starts'],
];

/** Step 5 — pace. */
export function PaceStep({ register }: StepProps) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-soft">How full should your days be?</legend>
      <ChoiceCards name="pace" options={PACES} register={register} />
    </fieldset>
  );
}

/** The review: every answer at a glance before generating. */
export function ReviewStep({ values }: Pick<StepProps, 'values'>) {
  const days = values.startDate && values.endDate ? tripLength(values.startDate, values.endDate) : 0;
  const rows: [string, string][] = [
    ['Where', values.destination],
    ['When', `${values.startDate} → ${values.endDate} (${days} ${days === 1 ? 'day' : 'days'})`],
    ['Budget', `${formatMoney({ amount: values.budget, currency: 'INR' })} per person per day`],
    ['Who', TRAVELLERS.find(([k]) => k === values.travellers)?.[1] ?? values.travellers],
    ['Interests', values.interests.map((i) => INTERESTS.find(([k]) => k === i)?.[1] ?? i).join(', ')],
    ['Pace', PACES.find(([k]) => k === values.pace)?.[1] ?? values.pace],
  ];
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {rows.map(([term, value]) => (
        <div key={term} className={cn('rounded-2xl bg-ink/5 px-4 py-3', term === 'When' && 'sm:col-span-2')}>
          <dt className="text-xs font-bold tracking-[0.12em] text-soft uppercase">{term}</dt>
          <dd className="mt-0.5 font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
