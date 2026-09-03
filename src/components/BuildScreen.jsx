import React from 'react';
import TopNav from './TopNav.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import WeatherNudge from './WeatherNudge.jsx';
import ItineraryPicks from './ItineraryPicks.jsx';
import FeaturedPicks from './FeaturedPicks.jsx';
import StubList from './StubList.jsx';
import { BellIcon, BellOffIcon, CalendarIcon, ArrowRight, GearIcon } from './icons.jsx';
import { isNotifySupported } from '../lib/notify.js';

// Build — the home screen. No map here anymore (that moved to its own Map
// destination): this page is the fast path into a trip. Ready-made
// itineraries, a short walkable shortlist, an Events teaser, and the full
// attractions list. The complete filterable dining/wine/attractions list
// is its own Browse page, reached from the top nav.
export default function BuildScreen({
  planCount,
  notifyOn,
  onToggleNotify,
  sharedPlan,
  onAcceptShared,
  onDismissShared,
  installEvent,
  installDismissed,
  onInstall,
  onDismissInstall,
  weather,
  weatherDismissed,
  indoorAttractions,
  onDismissWeather,
  itineraries,
  isFullyAdded,
  onAddAll,
  featuredPicks,
  attractionsGuide,
  onOpenPlace,
  isInPlan,
  onTogglePlan,
  homeLabel,
  tripLabel,
  onSelectTab,
}) {
  return (
    <div className="screen screen-build">
      <div className="screen-topbar">
        <span className="screen-kicker">Santa Rosa · Sonoma Wine Country</span>
        <span className="screen-topbar-actions">
          {isNotifySupported() && (
            <button
              type="button"
              className={`icon-ghost-btn${notifyOn ? ' icon-ghost-btn-active' : ''}`}
              onClick={onToggleNotify}
              aria-pressed={notifyOn}
              aria-label={notifyOn ? 'Turn off closing-soon reminders' : 'Turn on closing-soon reminders'}
              title={notifyOn ? 'Closing-soon reminders on' : 'Get closing-soon reminders'}
            >
              {notifyOn ? <BellIcon size={16} /> : <BellOffIcon size={16} />}
            </button>
          )}
          <button type="button" className="screen-trip-btn" onClick={() => onSelectTab('trip')}>
            <GearIcon size={13} />
            <span>{tripLabel}</span>
            {planCount > 0 && <span className="screen-trip-count">{planCount}</span>}
          </button>
        </span>
      </div>

      <TopNav activeTab="build" onSelect={onSelectTab} planCount={planCount} />

      <div className="screen-body">
        {sharedPlan && (
          <div className="shared-plan-banner">
            <span>
              Someone shared a plan with you — {sharedPlan.length} {sharedPlan.length === 1 ? 'stop' : 'stops'}.
            </span>
            <div className="shared-plan-actions">
              <button type="button" className="btn btn-ghost" onClick={onDismissShared}>
                Dismiss
              </button>
              <button type="button" className="btn btn-primary" onClick={onAcceptShared}>
                Add to my plan
              </button>
            </div>
          </div>
        )}

        {installEvent && !installDismissed && (
          <InstallPrompt onInstall={onInstall} onDismiss={onDismissInstall} />
        )}

        {weather?.isRainy && !weatherDismissed && (
          <WeatherNudge
            tempF={weather.tempF}
            indoorPlaces={indoorAttractions}
            onOpenPlace={onOpenPlace}
            onDismiss={onDismissWeather}
          />
        )}

        <section className="home-section" aria-label="Ready-made itineraries">
          <h2 className="home-section-title">Ready-made itineraries</h2>
          <p className="home-section-sub">Tap one to drop every stop into your plan.</p>
          <ItineraryPicks itineraries={itineraries} isFullyAdded={isFullyAdded} onAddAll={onAddAll} />
        </section>

        <FeaturedPicks picks={featuredPicks} onOpenPlace={onOpenPlace} />

        <button type="button" className="events-teaser" onClick={() => onSelectTab('events')}>
          <span className="events-teaser-glyph">
            <CalendarIcon size={18} />
          </span>
          <span className="events-teaser-body">
            <span className="events-teaser-title">What's on while you're here</span>
            <span className="events-teaser-sub">Festivals, releases and music around Sonoma County</span>
          </span>
          <ArrowRight size={16} />
        </button>

        <StubList
          guide={attractionsGuide}
          onOpenPlace={(p) => onOpenPlace(p, 'attractions')}
          isInPlan={(p) => isInPlan(p, 'attractions')}
          onTogglePlan={(p) => onTogglePlan(p, 'attractions')}
          homeLabel={homeLabel}
        />

        <button type="button" className="home-browse-all" onClick={() => onSelectTab('browse')}>
          Browse all dining, wine &amp; attractions <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
