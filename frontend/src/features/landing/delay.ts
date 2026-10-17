/**
 * delay.ts — tiny helper for staggered reveals: `style={delay(0.2)}` sets the
 * `--delay` custom property the reveal utilities in index.css read.
 */
import type { CSSProperties } from 'react';

export function delay(seconds: number): CSSProperties {
  return { '--delay': `${seconds}s` } as CSSProperties;
}
