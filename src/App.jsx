import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GUIDES_BY_KEY, HOTELS } from './data/guides.js';
import { ITINERARIES } from './data/itineraries.js';
import { loadPlan, savePlan, newStop } from './lib/planStorage.js';
import {
  loadTrip,
  saveTrip,
  hasAskedTrip,
  markAskedTrip,
  dateForDay,
  weekdayForDay,
} from './lib/tripStorage.js';
import { autoArrangePlan, optimizeDay, buildDaySchedule } from './lib/itineraryPlanner.js';
import { downloadIcs } from './lib/itineraryExport.js';
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
import TripPicker from './components/TripPicker.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import WeatherNudge from './components/WeatherNudge.jsx';
import ItineraryPicks from './components/ItineraryPicks.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import { BellIcon, BellOffIcon } from './components/icons.jsx';
import { isNotifyEnabled, enableNotify, disableNotify, isNotifySupported } from './lib/notify.js';

const stopKey = (s) => `${s.guideKey}:${s.name}`;

export default function App() {
  const [guide, setGuideKey] = useState('dining');
  const [activeTab, setActiveTab] = useState('build'); // 'build' | 'plan' | 'map'
  const [view, setView] = useState('tabs'); // 'tabs' | 'detail'
  const [selectedPlace, setSelectedPlace] = useState(null); // resolved place + guideKey
  const [emphasizedName, setEmphasizedName] = useState(null);

  const [planStops, setPlanStops] = useState(() => loadPlan());

  // One snapshot, one undo — every action that throws away arrangement the
  // visitor might have wanted (auto-arrange, clear, clear a day, optimize a
  // day) stashes the plan first and offers a single revert, rather than
  // each growing its own confirm dialog. Cleared as soon as they do
  // anything else, so Undo never quietly reverts something unexpected.
  const [undoState, setUndoState] = useState(null); // { stops, label }

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

  // How many days the visitor is in town — powers the Plan tab's day
  // columns and lib/itineraryPlanner.js's auto-arrange. Asked once, right
  // after the hotel question (never both sheets at once), reopenable
  // later from the Plan tab's "Trip length" button.
  const [trip, setTrip] = useState(() => loadTrip());
  const [showTripPicker, setShowTripPicker] = useState(() => hasAskedHomeHotel() && !hasAskedTrip());

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
  const homeHotel = homeHotelKey && homeHotelKey !== 'courthouseSquare' ? HOTELS[homeHotelKey] : null;
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

  // Resolved plan stops: the place's own data from guides.js, plus this
  // visitor's decisions layered on top. Note the deliberate rename —
  // `place.note` is the guide's category label ("Breakfast / Diner"), so
  // the visitor's own note rides along as `userNote` rather than clobbering
  // it. `day` stays null when the stop is saved but not yet scheduled.
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
            day: ref.day ?? null,
            order: ref.order ?? 0,
            durationMin: ref.durationMin ?? null,
            startMin: ref.startMin ?? null,
            userNote: ref.note ?? null,
            walk,
          };
        })
        .filter(Boolean),
    [planStops, homeHotel]
  );

  useEffect(() => {
    // Only scheduled stops can be "next" — something sitting unscheduled in
    // the saved tray has no place in the day's running order.
    nextUnvisitedRef.current =
      planPlaces
        .filter((p) => p.day != null)
        .sort((a, b) => a.day - b.day || a.order - b.order)
        .find((p) => !p.visited) || null;
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

  // Adding a place saves it *unscheduled* rather than dropping it on Day 1:
  // wanting to go somewhere and having decided when are different things,
  // and the Plan tab's saved tray is where the first becomes the second
  // (by dragging, by the stop editor, or by Auto-arrange).
  function toggleInPlan(place, guideKey) {
    setPlanStops((prev) => {
      const exists = prev.some((s) => s.guideKey === guideKey && s.name === place.name);
      if (exists) return prev.filter((s) => !(s.guideKey === guideKey && s.name === place.name));
      const order = prev.filter((s) => s.day == null).length;
      return [...prev, newStop(guideKey, place.name, { order })];
    });
  }

  // Additive only — used by the curated itinerary "Add all" buttons and by
  // accepting a shared plan. Anything already in the plan is left exactly
  // as it is, not duplicated or reordered. A shared plan's refs already
  // carry day/order (the sharer's own arrangement) and keep them; a
  // curated itinerary's refs don't, so those default to Day 1, appended.
  function addManyToPlan(refs) {
    setPlanStops((prev) => {
      const existing = new Set(prev.map((s) => `${s.guideKey}:${s.name}`));
      let day1Count = prev.filter((s) => (s.day || 1) === 1).length;
      const additions = [];
      refs.forEach((r) => {
        const key = `${r.guideKey}:${r.name}`;
        if (existing.has(key)) return;
        existing.add(key);
        // A shared plan carries the sharer's own arrangement and per-stop
        // choices (how long, any fixed time, their note) — all of it comes
        // across, including a stop they had saved but not scheduled.
        const carried = {
          durationMin: Number.isFinite(r.durationMin) ? r.durationMin : null,
          startMin: Number.isFinite(r.startMin) ? r.startMin : null,
          note: typeof r.note === 'string' ? r.note : null,
        };
        if (Number.isFinite(r.day) || r.day === null) {
          additions.push(
            newStop(r.guideKey, r.name, {
              ...carried,
              day: Number.isFinite(r.day) ? r.day : null,
              order: Number.isFinite(r.order) ? r.order : 0,
            })
          );
        } else {
          // A curated itinerary or a shared plan is already *a plan* — it
          // lands scheduled, unlike a single place tapped from a guide,
          // which lands in the saved tray.
          additions.push(newStop(r.guideKey, r.name, { day: 1, order: day1Count }));
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
      prev.map((s) => (s.guideKey === ref.guideKey && s.name === ref.name ? { ...s, visited: !s.visited } : s))
    );
  }

  // Drag-reorder in PlanSheet hands back the whole plan's new day/order
  // assignment in one shot once a drag is released. `day: null` here means
  // the stop was dropped into the saved tray.
  function reorderPlan(flatList) {
    setUndoState(null);
    setPlanStops((prev) => {
      const byKey = new Map(flatList.map((f) => [`${f.guideKey}:${f.name}`, f]));
      return prev.map((s) => {
        const next = byKey.get(`${s.guideKey}:${s.name}`);
        return next ? { ...s, day: next.day ?? null, order: next.order } : s;
      });
    });
  }

  // The single undo path shared by every destructive plan action.
  function snapshotPlan(label) {
    setUndoState({ stops: planStops, label });
  }

  function undoPlanChange() {
    if (!undoState) return;
    setPlanStops(undoState.stops);
    setUndoState(null);
  }

  // Patch one stop's own fields (duration, pinned time, day, note) — the
  // stop editor's only write path. Moving to a different day also puts the
  // stop at the end of that day rather than colliding with an existing
  // order value.
  function updateStop(ref, patch) {
    setUndoState(null);
    setPlanStops((prev) => {
      const movingDay = Object.prototype.hasOwnProperty.call(patch, 'day') && patch.day !== ref.day;
      const tailOrder = movingDay ? prev.filter((s) => (s.day ?? null) === (patch.day ?? null)).length : null;
      return prev.map((s) => {
        if (s.guideKey !== ref.guideKey || s.name !== ref.name) return s;
        return { ...s, ...patch, ...(movingDay ? { order: tailOrder } : null) };
      });
    });
  }

  function resolveStops(refs) {
    return refs
      .map((ref) => {
        const g = GUIDES_BY_KEY[ref.guideKey];
        const place = g && g.places.find((p) => p.name === ref.name);
        return place ? { ...place, ...ref } : null;
      })
      .filter(Boolean);
  }

  function applyArrangement(arranged) {
    const byKey = new Map(arranged.map((a) => [`${a.guideKey}:${a.name}`, a]));
    setPlanStops((prev) =>
      prev.map((s) => {
        const a = byKey.get(`${s.guideKey}:${s.name}`);
        return a ? { ...s, day: a.day, order: a.order } : s;
      })
    );
  }

  // Re-runs the planner over the whole plan — saved-but-unscheduled stops
  // included, since placing those is most of the point. Deliberate action
  // only (the Plan tab's button), and always undoable.
  function autoArrange() {
    const resolved = resolveStops(planStops);
    if (!resolved.length) return;
    snapshotPlan('Auto-arranged your itinerary.');
    applyArrangement(autoArrangePlan(resolved, trip, homeOrigin));
  }

  // Reorders one day and leaves every other day alone — the scope the
  // mainstream planners settled on, because a whole-trip reshuffle throws
  // away decisions the visitor already made.
  function optimizeOneDay(dayNumber) {
    const dayStops = resolveStops(planStops.filter((s) => s.day === dayNumber));
    if (dayStops.length < 2) return;
    snapshotPlan(`Reordered Day ${dayNumber} by walking distance.`);
    applyArrangement(optimizeDay(dayStops, dayNumber, homeOrigin));
  }

  // Empties a day back into the saved tray rather than deleting anything —
  // the stops are still wanted, just not on that day.
  function clearDay(dayNumber) {
    snapshotPlan(`Moved Day ${dayNumber} back to Saved.`);
    setPlanStops((prev) => {
      let tail = prev.filter((s) => s.day == null).length;
      return prev.map((s) => {
        if (s.day !== dayNumber) return s;
        const moved = { ...s, day: null, order: tail };
        tail += 1;
        return moved;
      });
    });
  }

  function swapDays(a, b) {
    snapshotPlan(`Swapped Day ${a} and Day ${b}.`);
    setPlanStops((prev) =>
      prev.map((s) => {
        if (s.day === a) return { ...s, day: b };
        if (s.day === b) return { ...s, day: a };
        return s;
      })
    );
  }

  function setDayNote(dayNumber, text) {
    setTrip((prev) => {
      const dayNotes = { ...(prev.dayNotes || {}) };
      const clean = (text || '').trim();
      if (clean) dayNotes[dayNumber] = clean.slice(0, 500);
      else delete dayNotes[dayNumber];
      const next = { ...prev, dayNotes };
      saveTrip(next);
      return next;
    });
  }

  // Builds the same day schedules the Plan tab shows and hands them to the
  // .ics writer. Returns false when the trip has no start date — without
  // one there are no real calendar dates to export, and guessing them into
  // someone's calendar would be worse than not exporting.
  function exportIcs() {
    if (!trip.startDate) return false;
    const days = [];
    for (let dayNumber = 1; dayNumber <= trip.days; dayNumber += 1) {
      const dayStops = planPlaces
        .filter((s) => s.day === dayNumber)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (!dayStops.length) continue;
      const schedule = buildDaySchedule(dayStops, {
        origin: homeOrigin,
        dayStartMin: trip.dayStartMin,
        dayEndMin: trip.dayEndMin,
        weekdayIndex: weekdayForDay(trip, dayNumber),
      });
      days.push({
        dayNumber,
        dateIso: dateForDay(trip, dayNumber),
        rows: schedule.rows.map((r) => ({ ...r, note: r.userNote || null })),
      });
    }
    return downloadIcs(days);
  }

  function removePlanStop(ref) {
    snapshotPlan(`Removed ${ref.name}.`);
    setPlanStops((prev) => prev.filter((s) => !(s.guideKey === ref.guideKey && s.name === ref.name)));
  }

  function clearPlan() {
    if (!planStops.length) return;
    snapshotPlan('Cleared your whole plan.');
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

  // The trip picker only edits length and start date — merge rather than
  // replace, so day notes and the day-start/end window survive an edit.
  function saveTripChoice(newTrip) {
    setTrip((prev) => {
      const merged = { ...prev, ...newTrip };
      saveTrip(merged);
      return merged;
    });
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
                {planPlaces.length ? `My Trip · ${planPlaces.length}` : 'Free · No sign-in'}
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

          <div className="home-main-row">
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

            <div className="home-list-col">
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
          </div>
        </div>
      )}

      {view === 'tabs' && activeTab === 'plan' && (
        <PlanScreen
          stops={planPlaces}
          trip={trip}
          origin={userLocation || homeOrigin}
          onOpenPlace={(s) => openPlace(s, s.guideKey)}
          onToggleVisited={toggleVisited}
          onRemove={removePlanStop}
          onClear={clearPlan}
          onShare={handleShare}
          onReorder={reorderPlan}
          onAutoArrange={autoArrange}
          onEditTrip={() => setShowTripPicker(true)}
          onUpdateStop={updateStop}
          onOptimizeDay={optimizeOneDay}
          onClearDay={clearDay}
          onSwapDays={swapDays}
          onSetDayNote={setDayNote}
          onExportIcs={exportIcs}
          onUndo={undoPlanChange}
          undoLabel={undoState?.label || null}
        />
      )}

      {view === 'tabs' && activeTab === 'map' && (
        <FullMapScreen
          planPlaces={planPlaces}
          trip={trip}
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
      {!showHotelPicker && showTripPicker && (
        <TripPicker trip={trip} onSave={saveTripChoice} onSkip={skipTripPicker} />
      )}
    </div>
  );
}
