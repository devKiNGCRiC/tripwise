/**
 * LiquidCanvas.tsx — the living liquid colour as a React component.
 *
 * Fills its positioned parent. A CSS gradient in the same palette sits behind the
 * canvas, so the area still looks right without WebGL (or before the first frame).
 * The palette follows the Day/Night theme and flows between them on toggle.
 */
import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { createLiquid, type LiquidHandle } from './liquidRenderer';

interface LiquidCanvasProps {
  /** Ripples follow the pointer over the parent element. */
  interactive?: boolean;
  className?: string;
}

export function LiquidCanvas({ interactive = true, className }: LiquidCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<LiquidHandle | null>(null);
  const { theme } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const night = theme === 'dark' ? 1 : 0;
  // The latest theme for the start-up effect, without restarting WebGL on every theme change.
  const nightRef = useRef(night);

  // Start (and restart if motion settings change) the renderer.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ripples listen on the section around us (this wrapper ignores the pointer so content stays clickable).
    const host = canvas.parentElement?.parentElement;
    const handle = createLiquid(canvas, { night: nightRef.current, interactive, still: reduceMotion, host });
    handleRef.current = handle;
    return () => {
      handle?.dispose();
      handleRef.current = null;
    };
  }, [interactive, reduceMotion]);

  // Theme change → the colours flow into the other palette.
  useEffect(() => {
    nightRef.current = night;
    handleRef.current?.setNight(night);
  }, [night]);

  return (
    <div aria-hidden className={cn('liquid-fallback pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
