/**
 * RouteMap.tsx — a small flight-tracker style map for the hero's "Now arriving" panel.
 *
 * Deliberately abstract: a latitude/longitude grid with each place pinned at its real
 * coordinates (no country outline). When the hero moves to a new place, a dashed
 * flight arc draws from the previous pin to the new one, and the arriving pin pulses. Decorative: the panel's text carries the same information.
 */
import { useId } from 'react';
import type { HeroPlace } from './heroPlaces';

/** Map window in degrees and drawing size in SVG units. */
const LON_MIN = 70;
const LON_MAX = 92;
const LAT_MIN = 7;
const LAT_MAX = 37;
const W = 160;
const H = 200;

/** Degrees → SVG position (simple equirectangular projection). */
function project(lat: number, lon: number) {
  return { x: ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W, y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H };
}

/** A gentle arc between two points: the control point bows out to one side, like a flight path. */
function arc(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${(mx - dy * 0.35).toFixed(1)} ${(my + dx * 0.35).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

/** Grid lines every 5 degrees. */
const MERIDIANS = [70, 75, 80, 85, 90];
const PARALLELS = [10, 15, 20, 25, 30, 35];

interface RouteMapProps {
  places: HeroPlace[];
  /** Place being shown now. */
  active: number;
  /** Place shown before it (where the arc starts). */
  previous: number;
  className?: string;
}

export function RouteMap({ places, active, previous, className }: RouteMapProps) {
  // useId() may contain characters that break url(#…) references, so keep letters/digits only.
  const maskId = `route-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const points = places.map((place) => project(place.lat, place.lon));
  const path = previous !== active ? arc(points[previous], points[active]) : null;

  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} aria-hidden className={className} fill="none">
      {/* Graticule */}
      <g stroke="currentColor" strokeOpacity={0.22} strokeWidth={0.7} strokeDasharray="1.5 3">
        {MERIDIANS.map((lon) => {
          const { x } = project(0, lon);
          return <line key={lon} x1={x} x2={x} y1={0} y2={H} />;
        })}
        {PARALLELS.map((lat) => {
          const { y } = project(lat, 0);
          return <line key={lat} x1={0} x2={W} y1={y} y2={y} />;
        })}
      </g>
      {/* Tropic of Cancer, the one line every Indian schoolkid knows */}
      <line x1={0} x2={W} y1={project(23.44, 0).y} y2={project(23.44, 0).y} stroke="currentColor" strokeOpacity={0.3} strokeWidth={0.7} />

      {/* The flight: a dashed arc that draws itself (a solid stroke drawing inside a mask) */}
      {path && (
        <g key={`${previous}-${active}`} className="text-gold">
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-6} y={-6} width={W + 12} height={H + 12}>
            <path d={path} stroke="#fff" strokeWidth={4} pathLength={100} className="animate-[route-draw_1.6s_cubic-bezier(.6,0,.2,1)_both] [stroke-dasharray:100]" />
          </mask>
          <path d={path} stroke="currentColor" strokeWidth={1.8} strokeDasharray="4 3" mask={`url(#${maskId})`} />
        </g>
      )}

      {/* Pins */}
      {points.map((point, i) => (
        <g key={places[i].name} transform={`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`}>
          {i === active && <circle r={8} className="animate-ping fill-gold/40 [transform-box:fill-box] origin-center" />}
          <circle r={i === active ? 4.2 : 3} className={i === active ? 'fill-gold' : 'fill-current opacity-60'} />
          <text x={8} y={4} fontSize={12} className={i === active ? 'fill-current font-semibold' : 'fill-current opacity-60'}>
            {places[i].name}
          </text>
        </g>
      ))}
    </svg>
  );
}
