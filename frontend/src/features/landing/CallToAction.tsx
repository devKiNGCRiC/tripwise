/**
 * CallToAction.tsx — the closing band: a black "night platform" with a yellow
 * board-style line and one clear action. Black on purpose in both themes, so it
 * lands as a full stop at the end of the page.
 */
import { Link } from 'react-router';
import { buttonClasses } from '@/components/ui/Button';

export function CallToAction() {
  return (
    <section className="px-4 py-24">
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 overflow-hidden rounded-3xl border-[3px] border-black bg-black p-8 text-white shadow-[8px_8px_0_var(--trip-saffron)] sm:p-14 md:flex-row md:items-center md:justify-between">
        {/* Faint platform-edge stripe along the bottom */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-3 [background:repeating-linear-gradient(90deg,var(--trip-yellow)_0_26px,#000_26px_52px)]" />
        <div>
          <h2 className="text-[clamp(36px,4.8vw,64px)] text-yellow [font-stretch:125%]">Your train leaves when you say so.</h2>
          <p className="mt-4 max-w-[46ch] text-xl text-white/80">Free to use, no card needed. Tell us where and we'll do the planning.</p>
        </div>
        <Link to="/plan" className={buttonClasses({ size: 'lg', className: 'shrink-0 border-white' })}>
          Start planning
        </Link>
      </div>
    </section>
  );
}
