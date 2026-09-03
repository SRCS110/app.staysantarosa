import React from 'react';
import { ArrowRight } from './icons.jsx';

// Horizontally-scrolling curated bundle cards on the Build tab — the fast
// path past decision paralysis for a guest who'd rather not build a plan
// stop by stop. "Add all" is additive, never destructive: anything already
// in the plan is simply left alone.
export default function ItineraryPicks({ itineraries, isFullyAdded, onAddAll }) {
  return (
    <div className="itinerary-row" role="list" aria-label="Curated itineraries">
      {itineraries.map((itin) => {
        const added = isFullyAdded(itin.refs);
        return (
          <div key={itin.key} className="itinerary-card" role="listitem">
            <p className="itinerary-card-title">{itin.title}</p>
            <p className="itinerary-card-blurb">{itin.blurb}</p>
            <p className="itinerary-card-count">{itin.refs.length} stops</p>
            <button
              type="button"
              className={`itinerary-card-cta${added ? ' itinerary-card-cta-done' : ''}`}
              onClick={() => onAddAll(itin.refs)}
              disabled={added}
            >
              {added ? '✓ In plan' : 'Add all to plan'}
              {!added && <ArrowRight size={14} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
