import React from 'react';
import MapView from './MapView.jsx';
import GuideChips from './GuideChips.jsx';
import RingOriginSheet from './RingOriginSheet.jsx';
import { haversineMiles, walkMinutes, driveMinutes } from '../lib/geo.js';

// The Map tab — everything shown relative to you. The screen is pinned to
// exactly one viewport height (no page scroll): topbar + chips take their
// natural height, and the map fills every remaining pixel below them —
// standard Leaflet touch/wheel handling, any touch pans it. In Rings mode
// the origin switcher docks below the map (its own internal scroll if it
// runs long) instead of eating into the map's height when it isn't shown.
// The plan itself lives on its own Plan tab now, not docked under the map.
export default function FullMapScreen({
  activeGuideKey,
  onSelectGuide,
  places,
  planPlaces,
  hotels,
  userLocation,
  locating,
  onLocateToggle,
  locateError,
  emphasizedName,
  onOpenPlace,
  mapMode,
  onSetMapMode,
  ringOriginKey,
  onSetRingOriginKey,
}) {
  const origins = [
    { key: 'courthouseSquare', label: 'Courthouse Square', point: hotels.courthouseSquare },
    { key: 'me', label: 'My location', point: userLocation, disabled: !userLocation },
  ];
  const activeOrigin = origins.find((o) => o.key === ringOriginKey && (!o.disabled)) || origins[0];

  const nextStop = planPlaces.find((p) => !p.visited);
  let nextStopDistance = null;
  if (nextStop) {
    const from = userLocation || hotels.courthouseSquare;
    const miles = haversineMiles(from, nextStop);
    nextStopDistance =
      miles <= 1
        ? `${walkMinutes(miles)} min walk${userLocation ? ' from you' : ' from Courthouse Square'}`
        : `${driveMinutes(miles)} min drive${userLocation ? ' from you' : ' from Courthouse Square'}`;
  }

  return (
    <div className="full-map-screen">
      <div className="full-map-topbar">
        <span className="home-kicker">Santa Rosa · Sonoma Wine Country</span>
        <div className="full-map-mode-toggle" role="tablist" aria-label="Map style">
          <button
            type="button"
            role="tab"
            aria-selected={mapMode === 'pins'}
            className={`mode-toggle-btn${mapMode === 'pins' ? ' mode-toggle-btn-active' : ''}`}
            onClick={() => onSetMapMode('pins')}
          >
            Pins
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mapMode === 'rings'}
            className={`mode-toggle-btn${mapMode === 'rings' ? ' mode-toggle-btn-active' : ''}`}
            onClick={() => onSetMapMode('rings')}
          >
            Rings
          </button>
        </div>
      </div>

      <div className="full-map-chips">
        <GuideChips activeKey={activeGuideKey} onSelect={onSelectGuide} />
      </div>

      <div className="full-map-canvas-wrap">
        <MapView
          places={places}
          guideKey={activeGuideKey}
          planPlaces={planPlaces}
          hotels={hotels}
          userLocation={userLocation}
          mode={mapMode}
          ringOrigin={activeOrigin.point}
          emphasizedName={emphasizedName}
          onPinTap={(place, guideKey) => onOpenPlace(place, guideKey)}
          fullscreen
          fitKey={`${activeGuideKey}:${mapMode}:${ringOriginKey}`}
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
      </div>

      {mapMode === 'rings' && (
        <div className="map-plan-section">
          <RingOriginSheet
            origins={origins}
            activeKey={activeOrigin.key}
            onSelect={onSetRingOriginKey}
            places={places}
            originPoint={activeOrigin.point}
          />
        </div>
      )}
    </div>
  );
}
