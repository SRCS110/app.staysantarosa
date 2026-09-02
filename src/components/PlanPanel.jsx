import React from 'react';
import MapView from './MapView.jsx';

// Home screen's persistent plan panel — now a real, live Leaflet map (small),
// showing the active guide's pins plus the visitor's location if they've
// turned it on. Tap "Full map" (rendered by App.jsx over this panel) to open
// the full-screen map (Page 3) with the plan route and walking-time rings.
export default function PlanPanel({
  places,
  guideKey,
  hotels,
  userLocation,
  activeGuideLabel,
  emphasizedPlaceId,
  onPinTap,
  locating,
  onLocateToggle,
  locateError,
}) {
  return (
    <MapView
      places={places}
      guideKey={guideKey}
      planPlaces={[]}
      hotels={hotels}
      userLocation={userLocation}
      mode="pins"
      emphasizedName={emphasizedPlaceId}
      onPinTap={onPinTap}
      fitKey={`home:${activeGuideLabel}`}
      locating={locating}
      onLocateToggle={onLocateToggle}
      locateError={locateError}
    />
  );
}
