import React from 'react';
import { HOTELS } from '../data/guides.js';

// Schematic, printed-brochure-style street plan — deliberately not a real
// map. Streets are drawn as plain rotated bars over a tinted ground; the
// dashed circle marks Old Courthouse Square, downtown's civic center.
// Pin chips are placed by authored x/y percent per place, matching the
// design handoff's model (no map SDK, no lat/lng projection at render time).
const STREET_BARS = [
  { top: '58%', left: '6%', width: '88%', rotate: '-1deg', height: 3 },
  { top: '46%', left: '10%', width: '60%', rotate: '2deg', height: 2 },
  { top: '72%', left: '4%', width: '70%', rotate: '-2deg', height: 2 },
  { top: '30%', left: '38%', width: '40%', rotate: '4deg', height: 2 },
  { left: '34%', top: '10%', width: '80%', rotate: '90deg', height: 2 },
  { left: '58%', top: '8%', width: '78%', rotate: '88deg', height: 2 },
];

const STREET_LABELS = [
  { label: '4TH ST', x: 58, y: 62, rotate: -1 },
  { label: 'RAILROAD SQ', x: 26, y: 76, rotate: -2 },
  { label: 'MENDOCINO AVE', x: 58, y: 30, rotate: 90 },
];

export default function PlanPanel({ places, activeGuideLabel, emphasizedPlaceId, onPinTap }) {
  return (
    <div className="plan-panel" role="img" aria-label={`Schematic plan of downtown Santa Rosa showing ${activeGuideLabel} locations`}>
      <div className="plan-ground">
        {STREET_BARS.map((b, i) => (
          <div
            key={i}
            className="plan-street"
            style={{
              top: b.top,
              left: b.left,
              width: b.width,
              height: b.height,
              transform: `rotate(${b.rotate})`,
            }}
          />
        ))}

        <div className="plan-square" style={{ left: `${HOTELS.hotelE.x - 1}%`, top: `${HOTELS.hotelE.y - 1}%` }} />

        {STREET_LABELS.map((s) => (
          <span
            key={s.label}
            className="plan-street-label"
            style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%,-50%) rotate(${s.rotate}deg)` }}
          >
            {s.label}
          </span>
        ))}

        {Object.values(HOTELS).map((h) => (
          <div
            key={h.key}
            className="plan-hotel"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            title={h.fullName}
          >
            <span>{h.name === 'Art House' ? 'AH' : 'E'}</span>
          </div>
        ))}

        {places
          .filter((p) => p.x !== undefined)
          .map((p) => (
            <button
              key={p.l}
              type="button"
              className={`plan-pin${emphasizedPlaceId === p.name ? ' plan-pin-emphasized' : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => onPinTap && onPinTap(p)}
              aria-label={`${p.name}, pin ${p.l}`}
            >
              {p.l}
            </button>
          ))}
      </div>
    </div>
  );
}
