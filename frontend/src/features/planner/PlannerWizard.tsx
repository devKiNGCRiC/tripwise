/**
 * PlannerWizard.tsx — the trip planner: five short questions (destination, dates, budget &
 * company, interests, pace), a review, then Generate. Each step is checked before moving
 * on; the answers live in one form so going Back never loses anything.
 *
 * While the AI plans, a generating screen shows. If today's 5 plans are used up, a dialog
 * explains when they reset; if both AI planners are busy, an alert offers Try again —
 * either way the answers stay put. Success opens the new trip. Beside the questions, a
 * live preview shows the place and the trip as it takes shape.
 */
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/utils/cn';
import { GeneratingScreen } from './GeneratingScreen';
import { useGenerateItinerary } from './hooks';
import { PlannerPreview } from './PlannerPreview';
import { QuotaDialog } from './QuotaDialog';
import { plannerResolver, type PlannerValues } from './schema';
import { BudgetStep, DatesStep, DestinationStep, InterestsStep, PaceStep, ReviewStep } from './steps';

/** The steps: title, a short prompt, and which fields must be valid to move on. */
const STEPS: { title: string; prompt: string; fields: (keyof PlannerValues)[] }[] = [
  { title: 'Where to?', prompt: 'A city, a region, a temple town — anywhere.', fields: ['destination'] },
  { title: 'When?', prompt: 'Up to 14 days.', fields: ['startDate', 'endDate'] },
  { title: 'Budget & company', prompt: 'We plan stays, food and transport to fit.', fields: ['budget', 'travellers'] },
  { title: 'What do you love?', prompt: 'The plan leans towards your interests.', fields: ['interests'] },
  { title: 'Your pace', prompt: 'Slow and deep, or see it all?', fields: ['pace'] },
  { title: 'Ready when you are', prompt: 'Check your answers, then let the planner work.', fields: [] },
];

/** The planner wizard, pre-filled from the page's address where possible. */
export function PlannerWizard({ initial }: { initial: Partial<PlannerValues> }) {
  const [step, setStep] = useState(0);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const navigate = useNavigate();
  const generate = useGenerateItinerary();
  const form = useForm<PlannerValues>({
    resolver: plannerResolver,
    defaultValues: { destination: '', startDate: '', endDate: '', budget: 3000, travellers: 'solo', interests: [], pace: 'balanced', ...initial },
  });
  const { register, formState, watch, setValue, trigger, getValues } = form;
  const values = watch();
  const last = STEPS.length - 1;
  const current = STEPS[step];

  /** Validate this step's fields, then move forward. */
  async function goNext() {
    if (await trigger(current.fields, { shouldFocus: true })) setStep((s) => Math.min(last, s + 1));
  }
  /** Check every answer (sending the traveller back to the first step with a problem), then ask the AI. */
  async function submit() {
    if (!(await trigger())) {
      const firstBad = STEPS.findIndex((s) => s.fields.some((f) => form.getFieldState(f).invalid));
      if (firstBad >= 0) setStep(firstBad);
      return;
    }
    const v = getValues();
    generate.mutate(
      { destination: v.destination.trim(), startDate: v.startDate, endDate: v.endDate, budget: { amount: v.budget, currency: 'INR' }, travellers: v.travellers, interests: v.interests, pace: v.pace },
      {
        onSuccess: ({ itinerary }) => navigate(`/trips/${itinerary.id}`),
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'QUOTA_EXCEEDED') setQuotaOpen(true);
        },
      },
    );
  }

  if (generate.isPending) return <GeneratingScreen destination={values.destination} preview={generate.preview} />;
  const busy = generate.error instanceof ApiError && generate.error.code !== 'QUOTA_EXCEEDED' ? generate.error : generate.error && !(generate.error instanceof ApiError) ? generate.error : null;

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
      <GlassPanel>
        {/* Progress: one segment per step */}
        <ol aria-label="Planner steps" className="mb-7 grid grid-cols-6 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s.title} aria-current={i === step ? 'step' : undefined} className={cn('h-1.5 rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-accent/20')}>
              <span className="sr-only">
                Step {i + 1}: {s.title}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs font-bold tracking-[0.16em] text-soft uppercase">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 key={step} className="swap mt-2 text-[clamp(32px,4vw,52px)]">
          {current.title}
        </h2>
        <p className="mt-2 mb-7 text-soft">{current.prompt}</p>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === last) void submit();
            else void goNext();
          }}
        >
          {step === 0 && <DestinationStep register={register} errors={formState.errors} values={values} setValue={setValue} />}
          {step === 1 && <DatesStep register={register} errors={formState.errors} values={values} setValue={setValue} />}
          {step === 2 && <BudgetStep register={register} errors={formState.errors} values={values} setValue={setValue} />}
          {step === 3 && <InterestsStep register={register} errors={formState.errors} values={values} setValue={setValue} />}
          {step === 4 && <PaceStep register={register} errors={formState.errors} values={values} setValue={setValue} />}
          {step === last && <ReviewStep values={values} />}

          {busy && step === last && (
            <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 font-medium text-danger">
              {busy instanceof ApiError ? busy.message : 'Something went wrong. Please try again.'}
              <Button size="sm" variant="secondary" onClick={() => void submit()}>
                Try again
              </Button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button variant="ghost" icon={<ArrowLeft aria-hidden className="size-4" />} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < last ? (
              <Button type="submit" size="lg">
                Next <ArrowRight aria-hidden className="size-4" />
              </Button>
            ) : (
              <Button type="submit" variant="glow" size="lg" icon={<Sparkles aria-hidden className="size-4" />}>
                Generate my trip
              </Button>
            )}
          </div>
        </form>
        {quotaOpen && (
          <QuotaDialog
            onClose={() => {
              setQuotaOpen(false);
              generate.reset();
            }}
          />
        )}
      </GlassPanel>
      <PlannerPreview values={values} step={step} />
    </div>
  );
}
