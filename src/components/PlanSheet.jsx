import React from 'react';
import { XIcon, ArrowRight, MapPinIcon } from './icons.jsx';

// Up to ~8 waypoints work reliably in Google Maps' free directions URL.
function googleMapsUrl(stops, origin) {
  if (!stops.length) return null;
  const pts = stops.map((s) => `${s.lat},${s.lng}`);
  const destination = pts[pts.length - 1];
  const waypoints = pts.slice(0, -1);
  const params = new URLSearchParams({ api: '1', travelmode: 'walking', destination });
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`);
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function PlanSheet({ stops, origin, onOpenPlace, onToggleVisited, onMove, onRemove, onClear }) {
  const visitedCount = stops.filter((s) => s.visited).length;
  const mapsUrl = googleMapsUrl(stops, origin);

  if (!stops.length) {
    return (
      <div className="plan-sheet">
        <p className="plan-sheet-empty">
          Your plan is empty. Open any place and tap <strong>Add to plan</strong> to start building a walk.
        </p>
      </div>
    );
  }

  return (
    <div className="plan-sheet">
      <div className="plan-sheet-header">
        <div>
          <h2 className="plan-sheet-title">My Plan</h2>
          <p className="plan-sheet-count">
            {visitedCount} of {stops.length} visited
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="plan-sheet-list">
        {stops.map((s, i) => (
          <div key={`${s.guideKey}:${s.name}`} className={`plan-row${s.visited ? ' plan-row-visited' : ''}`}>
            <button
              type="button"
              className="plan-row-check"
              onClick={() => onToggleVisited(s)}
              aria-label={s.visited ? `Mark ${s.name} not visited` : `Mark ${s.name} visited`}
              aria-pressed={s.visited}
            >
              {s.visited ? '✓' : i + 1}
            </button>
            <button type="button" className="plan-row-body" onClick={() => onOpenPlace(s)}>
              <span className="plan-row-name">{s.name}</span>
              <span className="plan-row-note">{s.note}</span>
            </button>
            <div className="plan-row-actions">
              <button
                type="button"
                className="plan-row-move"
                disabled={i === 0}
                onClick={() => onMove(i, -1)}
                aria-label={`Move ${s.name} earlier`}
              >
                ↑
              </button>
              <button
                type="button"
                className="plan-row-move"
                disabled={i === stops.length - 1}
                onClick={() => onMove(i, 1)}
                aria-label={`Move ${s.name} later`}
              >
                ↓
              </button>
              <button type="button" className="plan-row-remove" onClick={() => onRemove(s)} aria-label={`Remove ${s.name}`}>
                <XIcon size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {mapsUrl && (
        <a className="btn btn-primary btn-block plan-sheet-cta" href={mapsUrl} target="_blank" rel="noreferrer">
          <MapPinIcon size={16} /> Open in Google Maps <ArrowRight size={16} />
        </a>
      )}
    </div>
  );
}
