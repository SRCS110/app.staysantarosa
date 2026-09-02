import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDES_BY_KEY, HOTELS } from './data/guides.js';
import { loadPlan, savePlan } from './lib/planStorage.js';
import PlanPanel from './components/PlanPanel.jsx';
import GuideChips from './components/GuideChips.jsx';
import StubList from './components/StubList.jsx';
import PlaceDetail from './components/PlaceDetail.jsx';
import FullMapScreen from './components/FullMapScreen.jsx';
import PlanScreen from './components/PlanScreen.jsx';
import BottomNav from './components/BottomNav.jsx';

export default function App() {
  const [guide, setGuideKey] = useState('dining');
  const [activeTab, setActiveTab] = useState('build'); // 'build' | 'plan' | 'map'
  const [view, setView] = useState('tabs'); // 'tabs' | 'detail'
  const [selectedPlace, setSelectedPlace] = useState(null); // resolved place + guideKey
  const [emphasizedName, setEmphasizedName] = useState(null);

  const [planStops, setPlanStops] = useState(() => loadPlan());
  const [mapMode, setMapMode] = useState('pins');
  const [ringOriginKey, setRingOriginKey] = useState('courthouseSquare');

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    savePlan(planStops);
  }, [planStops]);

  useEffect(
    () => () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    },
    []
  );

  const activeGuide = GUIDES_BY_KEY[guide];

  const planPlaces = useMemo(
    () =>
      planStops
        .map((ref) => {
          const g = GUIDES_BY_KEY[ref.guideKey];
          const place = g && g.places.find((p) => p.name === ref.name);
          return place ? { ...place, guideKey: ref.guideKey, visited: ref.visited } : null;
        })
        .filter(Boolean),
    [planStops]
  );

  function selectGuide(key) {
    setGuideKey(key);
    setEmphasizedName(null);
  }

  function openPlace(place, guideKey) {
    setSelectedPlace({ ...place, guideKey: guideKey || guide });
    setView('detail');
  }

  function backFromDetail() {
    setView('tabs');
  }

  function isInPlan(place, guideKey) {
    return planStops.some((s) => s.guideKey === guideKey && s.name === place.name);
  }

  function toggleInPlan(place, guideKey) {
    setPlanStops((prev) => {
      const exists = prev.some((s) => s.guideKey === guideKey && s.name === place.name);
      if (exists) return prev.filter((s) => !(s.guideKey === guideKey && s.name === place.name));
      return [...prev, { guideKey, name: place.name, visited: false }];
    });
  }

  function toggleVisited(ref) {
    setPlanStops((prev) =>
      prev.map((s) => (s.guideKey === ref.guideKey && s.name === ref.name ? { ...s, visited: !s.visited } : s))
    );
  }

  function movePlanStop(index, dir) {
    setPlanStops((prev) => {
      const next = prev.slice();
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removePlanStop(ref) {
    setPlanStops((prev) => prev.filter((s) => !(s.guideKey === ref.guideKey && s.name === ref.name)));
  }

  function clearPlan() {
    setPlanStops([]);
  }

  function onLocateToggle() {
    if (!('geolocation' in navigator)) {
      setLocateError('Location is not available in this browser.');
      return;
    }
    if (locating) {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setLocating(false);
      setUserLocation(null);
      return;
    }
    setLocateError(null);
    setLocating(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocateError(null);
      },
      (err) => {
        setLocating(false);
        setLocateError(err.code === 1 ? 'Location permission denied.' : 'Could not get your location.');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  return (
    <div className="app-shell">
      {view === 'tabs' && activeTab === 'build' && (
        <div className="home-screen">
          <div className="home-topbar">
            <span className="home-kicker">Santa Rosa · Sonoma Wine Country</span>
            <span className="home-free-pill">{planPlaces.length ? `My Plan · ${planPlaces.length}` : 'Free · No sign-in'}</span>
          </div>

          <div className="home-map-frame">
            <PlanPanel
              places={activeGuide.places}
              guideKey={guide}
              hotels={HOTELS}
              userLocation={userLocation}
              activeGuideLabel={activeGuide.title}
              emphasizedPlaceId={emphasizedName}
              onPinTap={(p) => openPlace(p, guide)}
              locating={locating}
              onLocateToggle={onLocateToggle}
              locateError={locateError}
            />
          </div>

          <GuideChips activeKey={guide} onSelect={selectGuide} />

          <StubList
            guide={activeGuide}
            onOpenPlace={(p) => openPlace(p, guide)}
            isInPlan={(p) => isInPlan(p, guide)}
            onTogglePlan={(p) => toggleInPlan(p, guide)}
          />
        </div>
      )}

      {view === 'tabs' && activeTab === 'plan' && (
        <PlanScreen
          stops={planPlaces}
          origin={userLocation || HOTELS.courthouseSquare}
          onOpenPlace={(s) => openPlace(s, s.guideKey)}
          onToggleVisited={toggleVisited}
          onMove={movePlanStop}
          onRemove={removePlanStop}
          onClear={clearPlan}
        />
      )}

      {view === 'tabs' && activeTab === 'map' && (
        <FullMapScreen
          activeGuideKey={guide}
          onSelectGuide={selectGuide}
          places={activeGuide.places}
          planPlaces={planPlaces}
          hotels={HOTELS}
          userLocation={userLocation}
          locating={locating}
          onLocateToggle={onLocateToggle}
          locateError={locateError}
          emphasizedName={emphasizedName}
          onOpenPlace={openPlace}
          mapMode={mapMode}
          onSetMapMode={setMapMode}
          ringOriginKey={ringOriginKey}
          onSetRingOriginKey={setRingOriginKey}
        />
      )}

      {view === 'detail' && selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          guideTitle={GUIDES_BY_KEY[selectedPlace.guideKey].title}
          userLocation={userLocation}
          inPlan={isInPlan(selectedPlace, selectedPlace.guideKey)}
          visited={planStops.some(
            (s) => s.guideKey === selectedPlace.guideKey && s.name === selectedPlace.name && s.visited
          )}
          onBack={backFromDetail}
          onToggleInPlan={() => toggleInPlan(selectedPlace, selectedPlace.guideKey)}
          onToggleVisited={() => toggleVisited({ guideKey: selectedPlace.guideKey, name: selectedPlace.name })}
        />
      )}

      {view === 'tabs' && (
        <BottomNav activeTab={activeTab} onSelect={setActiveTab} planCount={planPlaces.length} />
      )}
    </div>
  );
}
