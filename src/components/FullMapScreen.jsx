import React from 'react';
import MapView from './MapView.jsx';
import { haversineMiles, walkMinutes, driveMinutes } from '../lib/geo.js';

// The Map tab — your plan, and only your plan, on the real map. No guide
// browsing here (that's what Build's list and mini map are for) and no
// Pins/Rings mode toggle — just the stops you've added, each as a labeled
// card, with a route line between them and a Next stop banner. The screen
// is pinned to exactly one viewport height (no page scroll): topbar takes
// its natural height, the map fills every remaining pixel below it.
export default function FullMapScreen({
  planPlaces,
  hotels,
  userLocation,
  locating,
  onLocateToggle,
  locateError,
  emphasizedName,
  onOpenPlace,
  homeOrigin,
  homeOriginLabel,
}) {
  const nextStop = planPlaces.find((p) => !p.visited);
  let nextStopDistance = null;
  if (nextStop) {
    const from = userLocation || homeOrigin || hotels.courthouseSquare;
    const miles = haversineMiles(from, nextStop);
    const fromLabel = userLocation ? ' from you' : ` from ${homeOriginLabel || 'Courthouse Square'}`;
    nextStopDistance =
      miles <= 1 ? `${walkMinutes(miles)} min walk${fromLabel}` : `${driveMinutes(miles)} min drive${fromLabel}`;
  }

  return (
    <div className="full-map-screen">
      <div className="full-map-topbar">
        <span className="home-kicker">Santa Rosa · Sonoma Wine Country</span>
        <span className="full-map-plan-count">
          {planPlaces.length ? `${planPlaces.length} in plan` : 'Your plan'}
        </span>
      </div>

      <div className="full-map-canvas-wrap">
        <MapView
          planPlaces={planPlaces}
          hotels={hotels}
          userLocation={userLocation}
          emphasizedName={emphasizedName}
          onPinTap={(place, guideKey) => onOpenPlace(place, guideKey)}
          fullscreen
          fitKey={`plan:${planPlaces.map((p) => p.name).join('|')}`}
          locating={locating}
          onLocateToggle={onLocateToggle}
          locateError={locateError}
        />

        {nextStop && (
          <button type="button" className="next-stop-banner" onClick={() => onOpenPlace(nextStop, nextStop.guideKey)}>
            <span className="next-stop-kicker">Next stop</span>
            <span className="next-stop-name">{nextStop.name}</span>
            {nextStopDistance && <span className="next-stop-distance">{nextStopDistance}</span>}
          </button>
        )}

        {!planPlaces.length && (
          <div className="map-empty-plan">
            <span>Nothing in your plan yet — add places from Build to see them here.</span>
          </div>
        )}
      </div>
    </div>
  );
}
