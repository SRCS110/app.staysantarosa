import { html, useEffect, useMemo, useRef, useState } from './preact.js';
import { GUIDES_BY_KEY, HOTELS } from './data/guides.js';
import { ITINERARIES } from './data/itineraries.js';
import { FEATURED } from './data/featured.js';
import { loadPlan, savePlan } from './lib/planStorage.js';
import { loadTrip, saveTrip, hasAskedTrip, markAskedTrip } from './lib/tripStorage.js';
import { autoArrangePlan } from './lib/itineraryPlanner.js';
import { estimateFrom } from './lib/geo.js';
import { loadHomeHotelKey, saveHomeHotelKey, hasAskedHomeHotel, markAskedHomeHotel } from './lib/hotelStorage.js';
import { getWeatherNudge } from './lib/weather.js';
import { buildShareUrl, readSharedPlanFromUrl, clearSharedPlanFromUrl } from './lib/share.js';
import { checkNextStopClosingSoon } from './lib/notify.js';
import BuildScreen from './components/BuildScreen.js';
import BrowseScreen from './components/BrowseScreen.js';
import EventsScreen from './components/EventsScreen.js';
import TripScreen from './components/TripScreen.js';
import PlaceDetail from './components/PlaceDetail.js';
import FullMapScreen from './components/FullMapScreen.js';
import PlanScreen from './components/PlanScreen.js';
import BottomNav from './components/BottomNav.js';
import HotelPicker from './components/HotelPicker.js';
import TripPicker from './components/TripPicker.js';
import OfflineBanner from './components/OfflineBanner.js';
import { isNotifyEnabled, enableNotify, disableNotify } from './lib/notify.js';

export default function App() {
  // Browse-page guide selection (dining/wine/attractions).
  const [guide, setGuideKey] = useState('dining');
  // 'build' | 'browse' | 'events' | 'plan' | 'map' | 'trip'
  const [activeTab, setActiveTab] = useState('build');
  const [view, setView] = useState('tabs'); // 'tabs' | 'detail'
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [emphasizedName] = useState(null);

  const [planStops, setPlanStops] = useState(() => loadPlan());

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(null);
  const watchIdRef = useRef(null);

  const [homeHotelKey, setHomeHotelKey] = useState(() => loadHomeHotelKey());
  const [showHotelPicker, setShowHotelPicker] = useState(() => !hasAskedHomeHotel());

  const [trip, setTrip] = useState(() => loadTrip());
  const [showTripPicker, setShowTripPicker] = useState(() => hasAskedHomeHotel() && !hasAskedTrip());

  const [installEvent, setInstallEvent] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  const [weather, setWeather] = useState(null);
  const [weatherDismissed, setWeatherDismissed] = useState(false);

  const [notifyOn, setNotifyOn] = useState(() => isNotifyEnabled());
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

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

  const homeHotel = homeHotelKey === 'artHouse' ? HOTELS.artHouse : null;
  const homeOrigin = homeHotel || HOTELS.courthouseSquare;
  const homeLabel = homeHotel ? homeHotel.name : 'Courthouse Square';
  const tripDays = Math.max(1, trip?.days || 2);
  const tripLabel = tripDays === 1 ? '1-day trip' : `${tripDays}-day trip`;

  const withHomeWalk = (places) =>
    homeHotel ? places.map((p) => ({ ...p, walk: estimateFrom(homeHotel, p) })) : places;

  const browseGuide = useMemo(() => {
    const g = GUIDES_BY_KEY[guide];
    return { ...g, places: withHomeWalk(g.places) };
  }, [guide, homeHotel]);

  const attractionsGuide = useMemo(() => {
    const g = GUIDES_BY_KEY.attractions;
    return { ...g, places: withHomeWalk(g.places) };
  }, [homeHotel]);

  const eventsGuide = GUIDES_BY_KEY.events;

  const featuredPicks = useMemo(
    () =>
      FEATURED.map((f) => {
        const g = GUIDES_BY_KEY[f.guideKey];
        const place = g && g.places.find((p) => p.name === f.name);
        if (!place) return null;
        const walk = homeHotel ? estimateFrom(homeHotel, place) : place.walk;
        return { ...place, guideKey: f.guideKey, why: f.why, walk };
      }).filter(Boolean),
    [homeHotel]
  );

  const planPlaces = useMemo(
    () =>
      planStops
        .map((ref) => {
          const g = GUIDES_BY_KEY[ref.guideKey];
          const place = g && g.places.find((p) => p.name === ref.name);
          if (!place) return null;
          const walk = homeHotel ? estimateFrom(homeHotel, place) : place.walk;
          return {
            ...place,
            guideKey: ref.guideKey,
            visited: ref.visited,
            day: ref.day || 1,
            order: ref.order ?? 0,
            time: Number.isFinite(ref.time) ? ref.time : null,
            walk,
          };
        })
        .filter(Boolean),
    [planStops, homeHotel]
  );

  useEffect(() => {
    nextUnvisitedRef.current =
      planPlaces
        .slice()
        .sort((a, b) => a.day - b.day || a.order - b.order)
        .find((p) => !p.visited) || null;
  }, [planPlaces]);

  const indoorAttractions = useMemo(
    () => GUIDES_BY_KEY.attractions.places.filter((p) => p.indoor),
    []
  );

  function selectGuide(key) {
    setGuideKey(key);
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
      const day = 1;
      const order = prev.filter((s) => (s.day || 1) === day).length;
      return [...prev, { guideKey, name: place.name, visited: false, day, order }];
    });
  }

  function addManyToPlan(refs) {
    setPlanStops((prev) => {
      const existing = new Set(prev.map((s) => `${s.guideKey}:${s.name}`));
      let day1Count = prev.filter((s) => (s.day || 1) === 1).length;
      const additions = [];
      refs.forEach((r) => {
        const key = `${r.guideKey}:${r.name}`;
        if (existing.has(key)) return;
        existing.add(key);
        if (Number.isFinite(r.day)) {
          additions.push({
            guideKey: r.guideKey,
            name: r.name,
            visited: false,
            day: r.day,
            order: Number.isFinite(r.order) ? r.order : 0,
            ...(Number.isFinite(r.time) ? { time: Math.round(r.time) } : {}),
          });
        } else {
          additions.push({
            guideKey: r.guideKey,
            name: r.name,
            visited: false,
            day: 1,
            order: day1Count,
          });
          day1Count += 1;
        }
      });
      return additions.length ? [...prev, ...additions] : prev;
    });
  }

  function isFullyAdded(refs) {
    return refs.every((r) => planStops.some((s) => s.guideKey === r.guideKey && s.name === r.name));
  }

  function toggleVisited(ref) {
    setPlanStops((prev) =>
      prev.map((s) =>
        s.guideKey === ref.guideKey && s.name === ref.name ? { ...s, visited: !s.visited } : s
      )
    );
  }

  // Visitor-set clock time for one stop (minutes from midnight), or null
  // to hand that stop back to the auto-suggested time.
  function setStopTime(ref, minutes) {
    setPlanStops((prev) =>
      prev.map((s) => {
        if (s.guideKey !== ref.guideKey || s.name !== ref.name) return s;
        const next = { ...s };
        if (Number.isFinite(minutes)) next.time = Math.round(minutes);
        else delete next.time;
        return next;
      })
    );
  }

  function reorderPlan(flatList) {
    setPlanStops((prev) => {
      const byKey = new Map(flatList.map((f) => [`${f.guideKey}:${f.name}`, f]));
      return prev.map((s) => {
        const next = byKey.get(`${s.guideKey}:${s.name}`);
        return next ? { ...s, day: next.day, order: next.order } : s;
      });
    });
  }

  function autoArrange() {
    setPlanStops((prev) => {
      const resolved = prev
        .map((ref) => {
          const g = GUIDES_BY_KEY[ref.guideKey];
          const place = g && g.places.find((p) => p.name === ref.name);
          return place ? { ...place, guideKey: ref.guideKey } : null;
        })
        .filter(Boolean);
      if (!resolved.length) return prev;
      const arranged = autoArrangePlan(resolved, trip, homeOrigin);
      const byKey = new Map(arranged.map((a) => [`${a.guideKey}:${a.name}`, a]));
      return prev.map((s) => {
        const a = byKey.get(`${s.guideKey}:${s.name}`);
        return a ? { ...s, day: a.day, order: a.order } : s;
      });
    });
  }

  function removePlanStop(ref) {
    setPlanStops((prev) =>
      prev.filter((s) => !(s.guideKey === ref.guideKey && s.name === ref.name))
    );
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
        return null;
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

  function afterHotelPicker() {
    setShowHotelPicker(false);
    if (!hasAskedTrip()) setShowTripPicker(true);
  }

  function pickHomeHotel(key) {
    setHomeHotelKey(key);
    saveHomeHotelKey(key);
    markAskedHomeHotel();
    afterHotelPicker();
  }

  function skipHomeHotel() {
    markAskedHomeHotel();
    afterHotelPicker();
  }

  function saveTripChoice(newTrip) {
    setTrip(newTrip);
    saveTrip(newTrip);
    markAskedTrip();
    setShowTripPicker(false);
  }

  function skipTripPicker() {
    markAskedTrip();
    setShowTripPicker(false);
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
        setLocateError(
          err.code === 1 ? 'Location permission denied.' : 'Could not get your location.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }

  return html`
    <div className="app-shell">
      ${!isOnline && html`<${OfflineBanner} />`}

      ${view === 'tabs' &&
      activeTab === 'build' &&
      html`
        <${BuildScreen}
          planCount=${planPlaces.length}
          notifyOn=${notifyOn}
          onToggleNotify=${toggleNotify}
          sharedPlan=${sharedPlan}
          onAcceptShared=${acceptSharedPlan}
          onDismissShared=${dismissSharedPlan}
          installEvent=${installEvent}
          installDismissed=${installDismissed}
          onInstall=${handleInstall}
          onDismissInstall=${() => setInstallDismissed(true)}
          weather=${weather}
          weatherDismissed=${weatherDismissed}
          indoorAttractions=${indoorAttractions}
          onDismissWeather=${() => setWeatherDismissed(true)}
          itineraries=${ITINERARIES}
          isFullyAdded=${isFullyAdded}
          onAddAll=${addManyToPlan}
          featuredPicks=${featuredPicks}
          attractionsGuide=${attractionsGuide}
          onOpenPlace=${openPlace}
          isInPlan=${isInPlan}
          onTogglePlan=${toggleInPlan}
          homeLabel=${homeLabel}
          tripLabel=${tripLabel}
          onSelectTab=${setActiveTab}
        />
      `}

      ${view === 'tabs' &&
      activeTab === 'browse' &&
      html`
        <${BrowseScreen}
          guideKey=${guide}
          onSelectGuide=${selectGuide}
          guide=${browseGuide}
          onOpenPlace=${openPlace}
          isInPlan=${isInPlan}
          onTogglePlan=${toggleInPlan}
          homeLabel=${homeLabel}
          planCount=${planPlaces.length}
          tripLabel=${tripLabel}
          onSelectTab=${setActiveTab}
        />
      `}

      ${view === 'tabs' &&
      activeTab === 'events' &&
      html`
        <${EventsScreen}
          guide=${eventsGuide}
          onOpenPlace=${openPlace}
          isInPlan=${isInPlan}
          onTogglePlan=${toggleInPlan}
          planCount=${planPlaces.length}
          tripLabel=${tripLabel}
          onSelectTab=${setActiveTab}
        />
      `}

      ${view === 'tabs' &&
      activeTab === 'trip' &&
      html`
        <${TripScreen}
          hotels=${HOTELS}
          homeHotelKey=${homeHotelKey}
          trip=${trip}
          planCount=${planPlaces.length}
          onSaveHotel=${(key) => {
            const resolved = key === 'artHouse' ? 'artHouse' : null;
            setHomeHotelKey(resolved);
            saveHomeHotelKey(resolved);
            markAskedHomeHotel();
          }}
          onSaveTrip=${saveTripChoice}
          onClearPlan=${clearPlan}
          onBack=${() => setActiveTab('build')}
          onSelectTab=${setActiveTab}
        />
      `}

      ${view === 'tabs' &&
      activeTab === 'plan' &&
      html`
        <${PlanScreen}
          stops=${planPlaces}
          trip=${trip}
          origin=${userLocation || homeOrigin}
          planCount=${planPlaces.length}
          tripLabel=${tripLabel}
          onSelectTab=${setActiveTab}
          onOpenPlace=${(s) => openPlace(s, s.guideKey)}
          onToggleVisited=${toggleVisited}
          onRemove=${removePlanStop}
          onClear=${clearPlan}
          onShare=${handleShare}
          onReorder=${reorderPlan}
          onAutoArrange=${autoArrange}
          onSetTime=${setStopTime}
          onEditTrip=${() => setActiveTab('trip')}
          onBrowse=${() => setActiveTab('browse')}
        />
      `}

      ${view === 'tabs' &&
      activeTab === 'map' &&
      html`
        <${FullMapScreen}
          planPlaces=${planPlaces}
          trip=${trip}
          hotels=${HOTELS}
          userLocation=${userLocation}
          locating=${locating}
          onLocateToggle=${onLocateToggle}
          locateError=${locateError}
          emphasizedName=${emphasizedName}
          onOpenPlace=${openPlace}
          homeOrigin=${homeOrigin}
          homeOriginLabel=${homeLabel}
          onSelectTab=${setActiveTab}
        />
      `}

      ${view === 'detail' &&
      selectedPlace &&
      html`
        <${PlaceDetail}
          place=${selectedPlace}
          guideTitle=${GUIDES_BY_KEY[selectedPlace.guideKey].title}
          userLocation=${userLocation}
          inPlan=${isInPlan(selectedPlace, selectedPlace.guideKey)}
          visited=${planStops.some(
            (s) =>
              s.guideKey === selectedPlace.guideKey && s.name === selectedPlace.name && s.visited
          )}
          onBack=${backFromDetail}
          onToggleInPlan=${() => toggleInPlan(selectedPlace, selectedPlace.guideKey)}
          onToggleVisited=${() =>
            toggleVisited({ guideKey: selectedPlace.guideKey, name: selectedPlace.name })}
          homeLabel=${homeLabel}
        />
      `}

      ${view === 'tabs' &&
      html`<${BottomNav}
        activeTab=${activeTab}
        onSelect=${setActiveTab}
        planCount=${planPlaces.length}
      />`}

      ${showHotelPicker &&
      html`<${HotelPicker} hotels=${HOTELS} onPick=${pickHomeHotel} onSkip=${skipHomeHotel} />`}
      ${!showHotelPicker &&
      showTripPicker &&
      html`<${TripPicker} trip=${trip} onSave=${saveTripChoice} onSkip=${skipTripPicker} />`}
    </div>
  `;
}
