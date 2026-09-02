import React, { useState } from 'react';
import MapView from './MapView.jsx';
import GuideChips from './GuideChips.jsx';
import PlanSheet from './PlanSheet.jsx';
import RingOriginSheet from './RingOriginSheet.jsx';
import { ChevronLeft } from './icons.jsx';
import { haversineMiles, walkMinutes, driveMinutes } from '../lib/geo.js';

// Page 3 — the full map. Shows the active guide's pins, the visitor's
// self-built plan as a numbered route with a "next stop" callout, and (mode
// toggle, top right) direction 1c's walking-time rings from a chosen origin.
export default function FullMapScreen({
  guide,
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
  onBack,
  onOpenPlace,
  onToggleVisited,
  onMovePlan,
  onRemovePlan,
  onClearPlan,
  mapMode,
  onSetMapMode,
  ringOriginKey,
  onSetRingOriginKey,
}) {
  const [sheetOpen, setSheetOpen] = useState(true);

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
        <button type="button" className="icon-circle-btn" onClick={onBack} aria-label="Back">
          <ChevronLeft />
        </button>
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

      <div className={`sheet-dock${sheetOpen ? '' : ' sheet-dock-collapsed'}`}>
        <button
          type="button"
          className="sheet-dock-handle"
          onClick={() => setSheetOpen((v) => !v)}
          aria-expanded={sheetOpen}
        >
          <span className="sheet-dock-grip" />
        </button>
        {sheetOpen &&
          (mapMode === 'rings' ? (
            <RingOriginSheet
              origins={origins}
              activeKey={activeOrigin.key}
              onSelect={onSetRingOriginKey}
              places={places}
              originPoint={activeOrigin.point}
            />
          ) : (
            <PlanSheet
              stops={planPlaces}
              origin={userLocation || hotels.courthouseSquare}
              onOpenPlace={(s) => onOpenPlace(s, s.guideKey)}
              onToggleVisited={onToggleVisited}
              onMove={onMovePlan}
              onRemove={onRemovePlan}
              onClear={onClearPlan}
            />
          ))}
      </div>
    </div>
  );
}
