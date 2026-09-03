import React, { useMemo, useState } from 'react';
import MapView from './MapView.jsx';
import { haversineMiles, walkMinutes, driveMinutes } from '../lib/geo.js';

// The Map tab — your plan, and only your plan, on the real map. No guide
// browsing here (that's what Build's list and mini map are for) and no
// Pins/Rings mode toggle — just the stops you've added, each as a labeled
// card, with a route line between them and a Next stop banner. A day
// filter (All / Day 1 / Day 2 / ...) narrows the route down to one day
// at a time for a multi-day trip; "All" keeps every stop, colored by day.
// The screen is pinned to exactly one viewport height (no page scroll):
// topbar + day chips take their natural height, the map fills the rest.
export default function FullMapScreen({
  planPlaces,
  trip,
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
  const tripDays = Math.max(1, trip?.days || 1);
  const [selectedDay, setSelectedDay] = useState(0); // 0 = All

  const sortedPlaces = useMemo(
    () => planPlaces.slice().sort((a, b) => (a.day || 1) - (b.day || 1) || (a.order ?? 0) - (b.order ?? 0)),
    [planPlaces]
  );
  const visiblePlaces = useMemo(
    () => (selectedDay === 0 ? sortedPlaces : sortedPlaces.filter((p) => (p.day || 1) === selectedDay)),
    [sortedPlaces, selectedDay]
  );

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

      {planPlaces.length > 0 && tripDays > 1 && (
        <div className="full-map-day-chips">
          <button
            type="button"
            className={`full-map-day-chip${selectedDay === 0 ? ' full-map-day-chip-active' : ''}`}
            onClick={() => setSelectedDay(0)}
          >
            All
          </button>
          {Array.from({ length: tripDays }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              className={`full-map-day-chip${selectedDay === d ? ' full-map-day-chip-active' : ''}`}
              onClick={() => setSelectedDay(d)}
            >
              Day {d}
            </button>
          ))}
        </div>
      )}

      <div className="full-map-canvas-wrap">
        <MapView
          planPlaces={visiblePlaces}
          hotels={hotels}
          userLocation={userLocation}
          emphasizedName={emphasizedName}
          onPinTap={(place, guideKey) => onOpenPlace(place, guideKey)}
          fullscreen
          fitKey={`plan:${selectedDay}:${visiblePlaces.map((p) => p.name).join('|')}`}
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
