/**
 * DayStrip.tsx — a slim glass strip that sticks under the navbar on the trip page:
 * one pill per day ("Day 3 · Fri 14"), so long trips are easy to move around. Tapping a
 * pill glides to that day; the day on screen is highlighted as you scroll.
 */
import { useEffect, useState } from 'react';
import type { Day } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';

/** The day-by-day jump strip. */
export function DayStrip({ days }: { days: Day[] }) {
  const [current, setCurrent] = useState(1);

  // Highlight the day whose card is crossing the upper part of the screen.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setCurrent(Number(entry.target.id.replace('day-', '')));
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    days.forEach((d) => {
      const el = document.getElementById(`day-${d.dayNumber}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [days]);

  return (
    <nav aria-label="Days" className="glass sticky top-[84px] z-30 -mx-1 overflow-x-auto rounded-full p-1.5 [scrollbar-width:none]">
      <ol className="flex w-max gap-1">
        {days.map((day) => {
          const on = day.dayNumber === current;
          const date = new Date(`${day.date}T00:00:00`);
          return (
            <li key={day.dayNumber}>
              <a
                href={`#day-${day.dayNumber}`}
                aria-current={on ? 'true' : undefined}
                className={cn('flex items-baseline gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors', on ? 'bg-ink text-on-ink' : 'hover:bg-ink/6')}
              >
                Day {day.dayNumber}
                <span className={cn('text-xs font-medium', on ? 'opacity-80' : 'text-soft')}>
                  {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
