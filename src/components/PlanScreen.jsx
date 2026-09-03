import React from 'react';
import PlanSheet from './PlanSheet.jsx';
import TopNav from './TopNav.jsx';
import { GearIcon } from './icons.jsx';

// The Plan tab — your self-built itinerary on its own, no map underneath.
// PlanSheet renders the day columns, the Google Maps handoff, and (when
// the plan is empty) a skeleton preview so the page never lands blank.
export default function PlanScreen({
  stops,
  trip,
  origin,
  planCount,
  tripLabel,
  onSelectTab,
  onOpenPlace,
  onToggleVisited,
  onRemove,
  onClear,
  onShare,
  onReorder,
  onAutoArrange,
  onSetTime,
  onEditTrip,
  onBrowse,
}) {
  return (
    <div className="plan-screen">
      <div className="screen-topbar">
        <span className="screen-kicker">Santa Rosa · Sonoma Wine Country</span>
        <button type="button" className="screen-trip-btn" onClick={() => onSelectTab('trip')}>
          <GearIcon size={13} />
          <span>{tripLabel}</span>
          {planCount > 0 && <span className="screen-trip-count">{planCount}</span>}
        </button>
      </div>
      <TopNav activeTab="plan" onSelect={onSelectTab} planCount={planCount} />
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
        onSetTime={onSetTime}
        onEditTrip={onEditTrip}
        onBrowse={onBrowse}
      />
    </div>
  );
}
