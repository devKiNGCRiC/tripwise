/**
 * Bunting.tsx — a string of festival flags (jhandi) used as a section divider.
 * Flags cycle through the palette and hang from a gently sagging string.
 * Static SVG (no animation), stretched to the full width; decoration only.
 */
import { cn } from '@/lib/utils/cn';

const WIDTH = 1600;
const FLAG = 40;
const COLORS = ['var(--trip-saffron)', 'var(--trip-yellow)', 'var(--trip-green)', 'var(--trip-red)', 'var(--trip-sky)', 'var(--trip-orange)'];

/** Height of the string at x: a soft wave so the line looks hung, not ruled. */
const sag = (x: number) => 8 + Math.sin((x / WIDTH) * Math.PI * 4) * 6;

export function Bunting({ className }: { className?: string }) {
  const flags = Array.from({ length: WIDTH / FLAG }, (_, i) => {
    const x = i * FLAG;
    const y1 = sag(x);
    const y2 = sag(x + FLAG);
    return { d: `M${x} ${y1} L${x + FLAG} ${y2} L${x + FLAG / 2} ${(y1 + y2) / 2 + 38} Z`, color: COLORS[i % COLORS.length] };
  });
  const string = Array.from({ length: WIDTH / FLAG + 1 }, (_, i) => `${i === 0 ? 'M' : 'L'}${i * FLAG} ${sag(i * FLAG)}`).join(' ');

  return (
    <div aria-hidden="true" className={cn('relative z-10 h-[54px]', className)}>
      <svg viewBox={`0 0 ${WIDTH} 54`} preserveAspectRatio="none" className="block size-full">
        {flags.map((f) => (
          <path key={f.d} d={f.d} style={{ fill: f.color }} stroke="#000" strokeWidth="2" />
        ))}
        <path d={string} fill="none" stroke="#000" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
