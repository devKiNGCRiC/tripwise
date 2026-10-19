/**
 * MarkIcon.tsx — line icons for the twelve Yatra marks, so they look the same on every
 * phone and match the hand-drawn style (system emojis differ from device to device).
 */
import { Backpack, Compass, Feather, Flower2, Globe2, type LucideIcon, Map, Mountain, Route, Sun, UsersRound, Waves, CloudRain } from 'lucide-react';

/** Each mark's icon (unknown ids fall back to a compass). */
const ICONS: Record<string, LucideIcon> = {
  'first-steps': Backpack,
  wanderer: Compass,
  'mountain-goat': Mountain,
  'desert-wind': Sun,
  'coast-calling': Waves,
  'monsoon-chaser': CloudRain,
  'family-yatri': UsersRound,
  'long-road': Route,
  storyteller: Feather,
  'beyond-india': Globe2,
  'three-worlds': Map,
  'all-seven': Flower2,
};

/** One mark's icon. */
export function MarkIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? Compass;
  return <Icon aria-hidden strokeWidth={1.7} className={className} />;
}
