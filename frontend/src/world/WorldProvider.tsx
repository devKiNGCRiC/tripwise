/**
 * WorldProvider.tsx — owns the living world every page floats over.
 *
 * Holds which of the seven regions is showing (remembered in localStorage as `tw_region`;
 * first visit = Himalaya), the landing page's auto-tour (every 10 s, ended for good by any
 * pick the traveller makes), and an optional photo palette that tints everything. It also
 * pushes the region's accent colours and sky onto <html> as CSS variables, so the whole
 * interface follows the region and Day/Night.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';
import { useTheme } from '@/theme/ThemeProvider';
import type { Palette } from './palette';
import { REGIONS, regionByKey, type Region, type RegionKey } from './regions';

/** localStorage key for the remembered region. */
export const REGION_STORAGE_KEY = 'tw_region';
/** Seconds each region shows during the auto-tour. */
export const TOUR_SECONDS = 10;

interface WorldContextValue {
  region: Region;
  /** Position of the region in REGIONS (0–6) */
  index: number;
  /** Show a region. `fromUser` = the traveller chose it (remembered, and the tour stops). */
  setRegion: (key: RegionKey, opts?: { fromUser?: boolean }) => void;
  touring: boolean;
  startTour: () => void;
  stopTour: () => void;
  /** Colours read from the traveller's photo (null = the region's own colours) */
  tint: Palette | null;
  setTint: (palette: Palette | null) => void;
}

const WorldContext = createContext<WorldContextValue | null>(null);

/** The remembered region's position, or Himalaya (0). Never throws (storage can be blocked). */
function readInitialIndex(): number {
  try {
    const saved = regionByKey(window.localStorage.getItem(REGION_STORAGE_KEY) ?? '');
    return saved ? REGIONS.indexOf(saved) : 0;
  } catch {
    return 0;
  }
}

/** Dark or light text for a "#rrggbb" background (simple luminance check). */
function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance > 0.55 ? '#111318' : '#ffffff';
}

export function WorldProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(readInitialIndex);
  const [touring, setTouring] = useState(false);
  const [tint, setTint] = useState<Palette | null>(null);
  const { theme } = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const region = REGIONS[index];

  /** Switch region; a traveller's own pick is remembered and ends the tour. */
  const setRegion = useCallback((key: RegionKey, opts: { fromUser?: boolean } = {}) => {
    const next = regionByKey(key);
    if (!next) return;
    setIndex(REGIONS.indexOf(next));
    if (opts.fromUser) {
      setTouring(false);
      try {
        window.localStorage.setItem(REGION_STORAGE_KEY, key);
      } catch {
        // Storage blocked: the choice still applies for this visit.
      }
    }
  }, []);
  const startTour = useCallback(() => setTouring(true), []);
  const stopTour = useCallback(() => setTouring(false), []);

  // The auto-tour: next region every TOUR_SECONDS (never for reduced / Calm motion).
  useEffect(() => {
    if (!touring || reduceMotion) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % REGIONS.length), TOUR_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [touring, reduceMotion]);

  // Paint the interface in the region's (or the photo's) colours, for the current theme.
  useEffect(() => {
    const mode = theme === 'dark' ? 'night' : 'day';
    const [accent, accent2] = tint ? tint.accents[mode] : region.ui[mode];
    const style = document.documentElement.style;
    style.setProperty('--trip-accent', accent);
    style.setProperty('--trip-accent-2', accent2);
    style.setProperty('--trip-on-accent', textOn(accent));
    style.setProperty('--trip-sky-top', region.sky[mode][0]);
    style.setProperty('--trip-sky-bottom', region.sky[mode][1]);
  }, [region, tint, theme]);

  const value = useMemo(
    () => ({ region, index, setRegion, touring, startTour, stopTour, tint, setTint }),
    [region, index, setRegion, touring, startTour, stopTour, tint],
  );
  return <WorldContext value={value}>{children}</WorldContext>;
}

/** Read and control the living world from any component inside <WorldProvider>. */
export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be used inside <WorldProvider>');
  return ctx;
}
