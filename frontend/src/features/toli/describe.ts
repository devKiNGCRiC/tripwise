/**
 * describe.ts (toli) — a suggested change in plain words, e.g. "Add Coracle ride to Day 1",
 * "Remove Hampi Bazaar from Day 2", "Add a day: Rest day".
 */
import type { SujhavChange } from '@/lib/api/types';

/** How each way of travelling reads. */
const MODE: Record<string, string> = { walk: 'walking', auto: 'auto', cab: 'cab', bus: 'bus', train: 'train', boat: 'boat' };

/** One suggested change, in words. */
export function describeChange(change: SujhavChange): string {
  switch (change.kind) {
    case 'add-stop':
      return `Add ${change.stop.title} to Day ${change.day}`;
    case 'remove-stop':
      return `Remove ${change.title} from Day ${change.day}`;
    case 'swap-stop':
      return `Swap ${change.title} for ${change.stop.title} on Day ${change.day}`;
    case 'move-stop':
      return `Move ${change.title} from Day ${change.day} to Day ${change.toDay}`;
    case 'retheme-day':
      return `Rename Day ${change.day}: ${change.theme}`;
    case 'add-day':
      return `Add a day: ${change.theme}`;
    case 'change-transport':
      return `Go by ${MODE[change.mode] ?? change.mode} after ${change.title} on Day ${change.day}`;
  }
}
