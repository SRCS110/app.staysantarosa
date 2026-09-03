import React from 'react';
import TopNav from './TopNav.jsx';
import { CalendarIcon, GearIcon } from './icons.jsx';
import { sortUpcomingEvents } from '../lib/events.js';

// Events — the community-events calendar on its own page (a phone bottom-nav
// tab). Sorted by next occurrence, fully-past ones dropped (see
// lib/events.js). Each row opens the event detail; the +/✓ adds it to the
// plan like any other stop. Dates shown are this app's best-guess next
// occurrence, never presented as the venue's published dates.
export default function EventsScreen({
  guide,
  onOpenPlace,
  isInPlan,
  onTogglePlan,
  planCount,
  tripLabel,
  onSelectTab,
}) {
  const events = sortUpcomingEvents(guide.places);

  return (
    <div className="screen screen-events">
      <div className="screen-topbar">
        <span className="screen-kicker">Events · Sonoma County</span>
        <button type="button" className="screen-trip-btn" onClick={() => onSelectTab('trip')}>
          <GearIcon size={13} />
          <span>{tripLabel}</span>
          {planCount > 0 && <span className="screen-trip-count">{planCount}</span>}
        </button>
      </div>

      <TopNav activeTab="events" onSelect={onSelectTab} planCount={planCount} />

      <div className="screen-body events-body">
        <h1 className="events-title">{guide.title}</h1>
        <p className="events-count">
          {events.length} {events.length === 1 ? 'event' : 'events'} coming up
        </p>

        <div className="events-list">
          {events.length === 0 && (
            <p className="stub-empty">No upcoming events on the calendar right now.</p>
          )}
          {events.map((e) => {
            const inPlan = isInPlan(e, 'events');
            return (
              <div key={e.name} className="event-row">
                <button type="button" className="event-row-tap" onClick={() => onOpenPlace(e, 'events')}>
                  <span className="event-date">
                    <CalendarIcon size={13} />
                    {e.hoursNote || 'Date TBA'}
                  </span>
                  <span className="event-name">{e.name}</span>
                  <span className="event-note">
                    {e.note}
                    {e.walk ? ` · ${e.walk.min} min${e.walk.mode === 'drive' ? ' drive' : ' walk'}` : ''}
                  </span>
                </button>
                <button
                  type="button"
                  className={`stub-plan-toggle${inPlan ? ' stub-plan-toggle-active' : ''}`}
                  onClick={() => onTogglePlan(e, 'events')}
                  aria-pressed={inPlan}
                  aria-label={inPlan ? `Remove ${e.name} from plan` : `Add ${e.name} to plan`}
                >
                  {inPlan ? '✓' : '+'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
