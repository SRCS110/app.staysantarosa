import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDES_BY_KEY, HOTELS } from './data/guides.js';
import { ITINERARIES } from './data/itineraries.js';
import { loadPlan, savePlan } from './lib/planStorage.js';
import { estimateFrom } from './lib/geo.js';
import { sortUpcomingEvents } from './lib/events.js';
import { loadHomeHotelKey, saveHomeHotelKey, hasAskedHomeHotel, markAskedHomeHotel } from './lib/hotelStorage.js';
import { getWeatherNudge } from './lib/weather.js';
import { buildShareUrl, readSharedPlanFromUrl, clearSharedPlanFromUrl } from './lib/share.js';
import { checkNextStopClosingSoon } from './lib/notify.js';
import PlanPanel from './components/PlanPanel.jsx';
import GuideChips from './components/GuideChips.jsx';
import StubList from './components/StubList.jsx';
import PlaceDetail from './components/PlaceDetail.jsx';
import FullMapScreen from './components/FullMapScreen.jsx';
import PlanScreen from './components/PlanScreen.jsx';
import BottomNav from './components/BottomNav.jsx';
import HotelPicker from './components/HotelPicker.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import WeatherNudge from './components/WeatherNudge.jsx';
import ItineraryPicks from './components/ItineraryPicks.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { BellIcon, BellOffIcon } from './components/icons.jsx';
import { isNotifyEnabled, enableNotify, disableNotify, isNotifySupported } from './lib/notify.js';

export default function App() {
  const [guide, setGuideKey] = useState('dining');
  const [activeTab, setActiveTab] = useState('build'); // 'build' | 'plan' | 'map'
  const [view, setView] = useState('tabs'); // 'tabs' | 'detail'
  const [selectedPlace, setSelectedPlace] = useState(null); // resolved place + guideKey
  const [emphasizedName, setEmphasizedName] = useState(null);

  const [planStops, setPlanStops] = useState(() => loadPlan());

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(null);
  const watchIdRef = useRef(null);

  // Which hotel every static walk/drive time is measured from — a
  // one-time question, answerable later too (see the Build topbar's
  // "Change" affordance). Defaults to the shared Courthouse Square figures
  // already baked into guides.js when skipped or unanswered.
  const [homeHotelKey, setHomeHotelKey] = useState(() => loadHomeHotelKey());
  const [showHotelPicker, setShowHotelPicker] = useState(() => !hasAskedHomeHotel());

  // Install-to-home-screen: only ever shown once the browser has actually
  // offered a beforeinstallprompt (Chrome/Android/Edge) — iOS Safari never
  // fires one, so guests there simply never see the banner.
  const [installEvent, setInstallEvent] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  // Rainy-day nudge — a best-effort live fetch, never blocking, never
  // shown at all if it fails or it isn't raining.
  const [weather, setWeather] = useState(null);
  const [weatherDismissed, setWeatherDismissed] = useState(false);

  const [notifyOn, setNotifyOn] = useState(() => isNotifyEnabled());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  // A link opened with ?plan=... offers to import that shared plan without
  // touching whatever's already saved, unless the visitor says yes.
  const [sharedPlan, setSharedPlan] = useState(() => readSharedPlanFromUrl());

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

  useEffect(() => {
    getWeatherNudge().then((result) => {
      if (result) setWeather(result);
    });
  }, []);

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      setInstallEvent(e);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Foreground-only reminder (see lib/notify.js for the honest limitation:
  // no backend means no true background push) — checked each time the tab
  // is brought back to the front.
  const nextUnvisitedRef = useRef(null);
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        checkNextStopClosingSoon(nextUnvisitedRef.current);
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const activeGuide = GUIDES_BY_KEY[guide];
  const homeHotel = homeHotelKey === 'artHouse' ? HOTELS.artHouse : null;
  const homeOrigin = homeHotel || HOTELS.courthouseSquare;
  const homeOriginLabel = homeHotel ? homeHotel.fullName : 'Old Courthouse Square';

  // The active guide's places, adjusted for display: Events gets sorted by
  // real-world date proximity with fully-past ones dropped, and every
  // guide's static walk/drive figure gets recomputed live from Art House
  // when that's the chosen home hotel (the baked-in default already is
  // Courthouse Square, so there's nothing to recompute there).
  const displayPlaces = useMemo(() => {
    let places = guide === 'events' ? sortUpcomingEvents(activeGuide.places) : activeGuide.places;
    if (homeHotel) {
      places = places.map((p) => ({ ...p, walk: estimateFrom(homeHotel, p) }));
    }
    return places;
  }, [guide, activeGuide, homeHotel]);
  const guideForList = useMemo(() => ({ ...activeGuide, places: displayPlaces }), [activeGuide, displayPlaces]);

  const planPlaces = useMemo(
    () =>
      planStops
        .map((ref) => {
          const g = GUIDES_BY_KEY[ref.guideKey];
          const place = g && g.places.find((p) => p.name === ref.name);
          if (!place) return null;
          const walk = homeHotel ? estimateFrom(homeHotel, place) : place.walk;
          return { ...place, guideKey: ref.guideKey, visited: ref.visited, walk };
        })
        .filter(Boolean),
    [planStops, homeHotel]
  );

  useEffect(() => {
    nextUnvisitedRef.current = planPlaces.find((p) => !p.visited) || null;
  }, [planPlaces]);

  const indoorAttractions = useMemo(
    () => GUIDES_BY_KEY.attractions.places.filter((p) => p.indoor),
    []
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

  // Additive only — used by the curated itinerary "Add all" buttons.
  // Anything already in the plan is left exactly as it is, not duplicated
  // or reordered.
  function addManyToPlan(refs) {
    setPlanStops((prev) => {
      const existing = new Set(prev.map((s) => `${s.guideKey}:${s.name}`));
      const additions = refs.filter((r) => !existing.has(`${r.guideKey}:${r.name}`)).map((r) => ({ ...r, visited: false }));
      return additions.length ? [...prev, ...additions] : prev;
    });
  }

  function isFullyAdded(refs) {
    return refs.every((r) => planStops.some((s) => s.guideKey === r.guideKey && s.name === r.name));
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

  async function handleShare() {
    const url = buildShareUrl(planStops);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Stay Santa Rosa plan', url });
        return 'shared';
      } catch {
        return null; // cancelled — not an error
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return null;
    }
  }

  function acceptSharedPlan() {
    if (sharedPlan) addManyToPlan(sharedPlan);
    setSharedPlan(null);
    clearSharedPlanFromUrl();
  }

  function dismissSharedPlan() {
    setSharedPlan(null);
    clearSharedPlanFromUrl();
  }

  function pickHomeHotel(key) {
    setHomeHotelKey(key);
    saveHomeHotelKey(key);
    markAskedHomeHotel();
    setShowHotelPicker(false);
  }

  function skipHomeHotel() {
    markAskedHomeHotel();
    setShowHotelPicker(false);
  }

  async function handleInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  async function toggleNotify() {
    if (notifyOn) {
      disableNotify();
      setNotifyOn(false);
      return;
    }
    const granted = await enableNotify();
    setNotifyOn(granted);
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
      {!isOnline && <OfflineBanner />}

      {view === 'tabs' && activeTab === 'build' && (
        <div className="home-screen">
          <div className="home-topbar">
            <span className="home-kicker">Santa Rosa · Sonoma Wine Country</span>
            <span className="home-topbar-actions">
              {isNotifySupported() && (
                <button
                  type="button"
                  className={`icon-ghost-btn${notifyOn ? ' icon-ghost-btn-active' : ''}`}
                  onClick={toggleNotify}
                  aria-pressed={notifyOn}
                  aria-label={notifyOn ? 'Turn off closing-soon reminders' : 'Turn on closing-soon reminders'}
                  title={notifyOn ? 'Closing-soon reminders on' : 'Get closing-soon reminders'}
                >
                  {notifyOn ? <BellIcon size={16} /> : <BellOffIcon size={16} />}
                </button>
              )}
              <span className="home-free-pill">
                {planPlaces.length ? `My Plan · ${planPlaces.length}` : 'Free · No sign-in'}
              </span>
            </span>
          </div>

          {sharedPlan && (
            <div className="shared-plan-banner">
              <span>
                Someone shared a plan with you — {sharedPlan.length} {sharedPlan.length === 1 ? 'stop' : 'stops'}.
              </span>
              <div className="shared-plan-actions">
                <button type="button" className="btn btn-ghost" onClick={dismissSharedPlan}>
                  Dismiss
                </button>
                <button type="button" className="btn btn-primary" onClick={acceptSharedPlan}>
                  Add to my plan
                </button>
              </div>
            </div>
          )}

          {installEvent && !installDismissed && (
            <InstallPrompt onInstall={handleInstall} onDismiss={() => setInstallDismissed(true)} />
          )}

          {weather?.isRainy && !weatherDismissed && (
            <WeatherNudge
              tempF={weather.tempF}
              indoorPlaces={indoorAttractions}
              onOpenPlace={openPlace}
              onDismiss={() => setWeatherDismissed(true)}
            />
          )}

          <div className="home-map-frame">
            <PlanPanel
              places={displayPlaces}
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

          <ItineraryPicks itineraries={ITINERARIES} isFullyAdded={isFullyAdded} onAddAll={addManyToPlan} />

          <StubList
            guide={guideForList}
            onOpenPlace={(p) => openPlace(p, guide)}
            isInPlan={(p) => isInPlan(p, guide)}
            onTogglePlan={(p) => toggleInPlan(p, guide)}
            homeLabel={homeHotel ? homeHotel.name : 'Courthouse Square'}
          />
        </div>
      )}

      {view === 'tabs' && activeTab === 'plan' && (
        <PlanScreen
          stops={planPlaces}
          origin={userLocation || homeOrigin}
          onOpenPlace={(s) => openPlace(s, s.guideKey)}
          onToggleVisited={toggleVisited}
          onMove={movePlanStop}
          onRemove={removePlanStop}
          onClear={clearPlan}
          onShare={handleShare}
        />
      )}

      {view === 'tabs' && activeTab === 'map' && (
        <FullMapScreen
          planPlaces={planPlaces}
          hotels={HOTELS}
          userLocation={userLocation}
          locating={locating}
          onLocateToggle={onLocateToggle}
          locateError={locateError}
          emphasizedName={emphasizedName}
          onOpenPlace={openPlace}
          homeOrigin={homeOrigin}
          homeOriginLabel={homeHotel ? homeHotel.name : 'Courthouse Square'}
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
          homeLabel={homeHotel ? homeHotel.name : 'Courthouse Square'}
        />
      )}

      {view === 'tabs' && (
        <BottomNav activeTab={activeTab} onSelect={setActiveTab} planCount={planPlaces.length} />
      )}

      {showHotelPicker && <HotelPicker hotels={HOTELS} onPick={pickHomeHotel} onSkip={skipHomeHotel} />}
    </div>
  );
}
