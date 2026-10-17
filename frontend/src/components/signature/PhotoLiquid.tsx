/**
 * PhotoLiquid.tsx — full-bleed photographs that behave like water (React wrapper
 * around photoLiquidRenderer.ts). Shows `urls[index]`; changing `index` pours the
 * next photo in. Ripples follow the pointer over the parent section.
 *
 * Plain <img> stand-ins sit underneath and cross-fade on their own, so the photo is
 * visible immediately, and still works without WebGL. Once the water version has
 * drawn its first frame, the canvas fades in over them.
 */
import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { cn } from '@/lib/utils/cn';
import { useTheme } from '@/theme/ThemeProvider';
import { createPhotoLiquid, type PhotoLiquidHandle } from './photoLiquidRenderer';

interface PhotoLiquidProps {
  /** Photo URLs (must allow CORS — Unsplash does). */
  urls: string[];
  /** Which photo is showing. */
  index: number;
  className?: string;
}

export function PhotoLiquid({ urls, index, className }: PhotoLiquidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<PhotoLiquidHandle | null>(null);
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const night = theme === 'dark' ? 1 : 0;
  // Latest values for the start-up effect, without restarting WebGL when they change.
  const nightRef = useRef(night);
  const urlRef = useRef(urls[index]);

  // Start (and restart if motion settings change) the renderer.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ripples listen on the section around us (this wrapper ignores the pointer so content stays clickable).
    const host = canvas.parentElement?.parentElement;
    const handle = createPhotoLiquid(canvas, { night: nightRef.current, still: reduceMotion, host, onReady: () => setReady(true) });
    handle?.show(urlRef.current);
    handleRef.current = handle;
    return () => {
      handle?.dispose();
      handleRef.current = null;
      setReady(false);
    };
  }, [reduceMotion]);

  // New index → pour the next photo in.
  useEffect(() => {
    urlRef.current = urls[index];
    handleRef.current?.show(urls[index]);
  }, [urls, index]);

  // Theme change → the grade flows between dawn and monsoon.
  useEffect(() => {
    nightRef.current = night;
    handleRef.current?.setNight(night);
  }, [night]);

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden bg-paper-2', className)}>
      {/* Stand-ins: visible at once, and the whole show when WebGL is unavailable */}
      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          crossOrigin="anonymous"
          decoding="async"
          fetchPriority={i === 0 ? 'high' : 'low'}
          className={cn(
            'absolute inset-0 size-full scale-105 object-cover transition-opacity duration-1000 dark:brightness-[.55] dark:saturate-[.7]',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      <canvas ref={canvasRef} className={cn('absolute inset-0 size-full transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0')} />
    </div>
  );
}
