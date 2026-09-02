import React, { useMemo } from 'react';
import { haversineMiles, ringRadiusMeters, RING_MINUTES } from '../lib/geo.js';

// Direction 1c's "switch hotel" bottom sheet, rebuilt against the real map:
// pick what the walking rings radiate from, see how many of the current
// guide's places fall inside each ring.
export default function RingOriginSheet({ origins, activeKey, onSelect, places, originPoint }) {
  const counts = useMemo(() => {
    if (!originPoint) return RING_MINUTES.map(() => 0);
    return RING_MINUTES.map((min) => {
      const radiusMiles = ringRadiusMeters(min) / 1609.34;
      return places.filter((p) => haversineMiles(originPoint, p) <= radiusMiles).length;
    });
  }, [places, originPoint]);

  return (
    <div className="ring-sheet">
      <p className="ring-sheet-caption">Rings from</p>
      <div className="ring-origin-row">
        {origins.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`ring-origin-btn${activeKey === o.key ? ' ring-origin-btn-active' : ''}${o.disabled ? ' ring-origin-btn-disabled' : ''}`}
            onClick={() => !o.disabled && onSelect(o.key)}
            disabled={o.disabled}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="ring-counts">
        {RING_MINUTES.map((min, i) => (
          <div className="ring-count" key={min}>
            <span className="ring-count-value">{counts[i]}</span>
            <span className="ring-count-label">within {min} min</span>
          </div>
        ))}
      </div>
    </div>
  );
}
