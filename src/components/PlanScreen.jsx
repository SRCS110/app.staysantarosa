import React from 'react';
import PlanSheet from './PlanSheet.jsx';

// The Plan tab — your self-built itinerary on its own, no map underneath.
// PlanSheet already renders its own "My Trip" header, day columns, and
// Google Maps handoff, so this is just the page frame around it.
export default function PlanScreen({
  stops,
  trip,
  origin,
  onOpenPlace,
  onToggleVisited,
  onRemove,
  onClear,
  onShare,
  onReorder,
  onAutoArrange,
  onEditTrip,
}) {
  return (
    <div className="plan-screen">
      <div className="plan-screen-topbar">
        <span className="plan-kicker">Santa Rosa · Sonoma Wine Country</span>
      </div>
      <PlanSheet
        stops={stops}
        trip={trip}
        origin={origin}
        onOpenPlace={onOpenPlace}
        onToggleVisited={onToggleVisited}
        onRemove={onRemove}
        onClear={onClear}
        onShare={onShare}
        onReorder={onReorder}
        onAutoArrange={onAutoArrange}
        onEditTrip={onEditTrip}
      />
    </div>
  );
}
