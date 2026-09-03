import React from 'react';
import PlanSheet from './PlanSheet.jsx';

// The Plan tab — your self-built itinerary on its own, no map underneath.
// PlanSheet already renders its own "My Plan" header, count, and Google
// Maps handoff, so this is just the page frame around it.
export default function PlanScreen({ stops, origin, onOpenPlace, onToggleVisited, onMove, onRemove, onClear, onShare }) {
  return (
    <div className="plan-screen">
      <div className="plan-screen-topbar">
        <span className="plan-kicker">Santa Rosa · Sonoma Wine Country</span>
      </div>
      <PlanSheet
        stops={stops}
        origin={origin}
        onOpenPlace={onOpenPlace}
        onToggleVisited={onToggleVisited}
        onMove={onMove}
        onRemove={onRemove}
        onClear={onClear}
        onShare={onShare}
      />
    </div>
  );
}
