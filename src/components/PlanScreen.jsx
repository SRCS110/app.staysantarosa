import React from 'react';
import PlanSheet from './PlanSheet.jsx';

// The Plan tab — your self-built itinerary on its own, no map underneath.
// PlanSheet already renders its own "My Trip" header, saved tray, day
// columns and Google Maps handoff, so this is just the page frame around
// it: a pass-through that keeps App.jsx's props in one visible list.
export default function PlanScreen(props) {
  return (
    <div className="plan-screen">
      <div className="plan-screen-topbar">
        <span className="plan-kicker">Santa Rosa · Sonoma Wine Country</span>
      </div>
      <PlanSheet {...props} />
    </div>
  );
}
