import React, { useMemo, useState } from 'react';
import { GUIDES, GUIDES_BY_KEY } from './data/guides.js';
import PlanPanel from './components/PlanPanel.jsx';
import GuideChips from './components/GuideChips.jsx';
import StubList from './components/StubList.jsx';
import PlaceDetail from './components/PlaceDetail.jsx';

export default function App() {
  // Deliberately minimal state — this app has no accounts and persists
  // nothing. `guide` picks the active filter; `selectedPlace` opens the
  // detail screen; `emphasizedName` is a transient plan highlight set by
  // "Show on plan".
  const [guide, setGuide] = useState('dining');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [emphasizedName, setEmphasizedName] = useState(null);

  const activeGuide = GUIDES_BY_KEY[guide];

  const screen = selectedPlace ? 'detail' : 'home';

  function openPlace(place) {
    setSelectedPlace(place);
  }

  function backToHome() {
    setSelectedPlace(null);
  }

  function showOnPlan() {
    if (selectedPlace) setEmphasizedName(selectedPlace.name);
    setSelectedPlace(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => setEmphasizedName(null), 2600);
  }

  function selectGuide(key) {
    setGuide(key);
    setEmphasizedName(null);
  }

  return (
    <div className="app-shell">
      {screen === 'home' ? (
        <div className="home-screen">
          <div className="home-topbar">
            <span className="home-kicker">Santa Rosa · Sonoma Wine Country</span>
            <span className="home-free-pill">Free · No sign-in</span>
          </div>

          <PlanPanel
            places={activeGuide.places}
            activeGuideLabel={activeGuide.title}
            emphasizedPlaceId={emphasizedName}
            onPinTap={openPlace}
          />

          <GuideChips activeKey={guide} onSelect={selectGuide} />

          <StubList guide={activeGuide} onOpenPlace={openPlace} />
        </div>
      ) : (
        <PlaceDetail
          place={selectedPlace}
          guideTitle={activeGuide.title}
          onBack={backToHome}
          onShowOnPlan={showOnPlan}
        />
      )}
    </div>
  );
}
