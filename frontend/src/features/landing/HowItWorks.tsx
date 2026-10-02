/**
 * HowItWorks.tsx — three numbered steps explaining the product in 5 seconds.
 */
import { Download, Sparkles, Sticker } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const STEPS = [
  { n: '01', icon: Sticker, title: 'Pick your vibe', text: 'Destination, dates, budget and interests — tap stickers, no essays.' },
  { n: '02', icon: Sparkles, title: 'AI plans every day', text: 'Morning to night, with costs, local tips and a packing list.' },
  { n: '03', icon: Download, title: 'Save, share, go', text: 'Download a PDF, send a link to your crew, collect the stamp.' },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="how-heading" className="text-4xl font-extrabold sm:text-5xl">
        How it works
      </h2>
      <ol className="mt-10 grid gap-6 md:grid-cols-3">
        {STEPS.map(({ n, icon: Icon, title, text }, index) => (
          <li key={n}>
            {/* Alternate tilts so the cards feel hand-placed, like stickers on a scrapbook page. */}
            <Card className={index === 1 ? 'h-full p-6 md:-rotate-1' : 'h-full p-6 md:rotate-1'}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-4xl font-bold text-ink/20">{n}</span>
                <span className="grid size-11 place-items-center rounded-xl border-2 border-line bg-mustard text-on-accent">
                  <Icon className="size-5" aria-hidden />
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-extrabold">{title}</h3>
              <p className="mt-2 text-ink-soft">{text}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
