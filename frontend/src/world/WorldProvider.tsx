/**
 * WorldProvider.tsx — owns the living world every page floats over.
 *
 * Holds which of the seven regions is showing (remembered in localStorage as `tw_region`;
 * first visit = Himalaya), the landing page's auto-tour (every 10 s; it never runs once the
 * traveller has picked a region — in this visit or an earlier one), and an optional photo palette that tints everything
 * (remembered in localStorage as `tw_tint`, so it survives a refresh; a passing tint, like a
 * friend's colours on their passport, is applied without being remembered). It also
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
/** localStorage key for the remembered photo colours. */
export const TINT_STORAGE_KEY = 'tw_tint';
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
  /** Tint with a photo's colours (null = back to the region's). `temporary` = don't remember it. */
  setTint: (palette: Palette | null, opts?: { temporary?: boolean }) => void;
}

const WorldContext = createContext<WorldContextValue | null>(null);

/** The remembered region's position, or -1 if none. Never throws (storage can be blocked). */
function readSavedIndex(): number {
  try {
    const saved = regionByKey(window.localStorage.getItem(REGION_STORAGE_KEY) ?? '');
    return saved ? REGIONS.indexOf(saved) : -1;
  } catch {
    return -1;
  }
}

/** A "#rrggbb" colour. */
const isHex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
/** Is this a whole, valid palette (saved data can be old or broken)? */
function isPalette(v: unknown): v is Palette {
  const p = v as Palette | null;
  return (
    !!p &&
    isHex(p.tint) &&
    Array.isArray(p.swatches) && p.swatches.length === 4 && p.swatches.every(isHex) &&
    [p.accents?.day, p.accents?.night].every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every(isHex))
  );
}

/** The remembered photo colours, or null. Never throws (storage can be blocked or hold junk). */
function readSavedTint(): Palette | null {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(TINT_STORAGE_KEY) ?? 'null');
    return isPalette(saved) ? saved : null;
  } catch {
    return null;
  }
}

/** Dark or light text for a "#rrggbb" background (simple luminance check). */
function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance > 0.55 ? '#111318' : '#ffffff';
}

/** Provides the living world (region, tour, photo tint) to everything inside it. */
export function WorldProvider({ children }: { children: ReactNode }) {
  const [savedIndex] = useState(readSavedIndex);
  const [index, setIndex] = useState(() => Math.max(0, savedIndex));
  const [touring, setTouring] = useState(false);
  // Has the traveller ever chosen a region? Then the world stays where they put it.
  const [picked, setPicked] = useState(savedIndex >= 0);
  const [tint, setTintState] = useState<Palette | null>(readSavedTint);
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
      setPicked(true);
      try {
        window.localStorage.setItem(REGION_STORAGE_KEY, key);
      } catch {
        // Storage blocked: the choice still applies for this visit.
      }
    }
  }, []);
  /** Tint the world, remembering it on this device unless it's only passing. */
  const setTint = useCallback((palette: Palette | null, opts: { temporary?: boolean } = {}) => {
    setTintState(palette);
    if (opts.temporary) return;
    try {
      if (palette) window.localStorage.setItem(TINT_STORAGE_KEY, JSON.stringify(palette));
      else window.localStorage.removeItem(TINT_STORAGE_KEY);
    } catch {
      // Storage blocked: the colours still apply for this visit.
    }
  }, []);
  const startTour = useCallback(() => setTouring(!picked), [picked]);
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
    [region, index, setRegion, touring, startTour, stopTour, tint, setTint],
  );
  return <WorldContext value={value}>{children}</WorldContext>;
}

/** Read and control the living world from any component inside <WorldProvider>. */
export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be used inside <WorldProvider>');
  return ctx;
}
